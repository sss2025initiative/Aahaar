import FoodInfo from "../models/foodInfoModel.js";
import Ngo from "../models/ngoModel.js";
import asyncHandler from "express-async-handler";
import { uploadFoodImages as uploadFoodImagesMiddleware, getFileUrl } from "../s3Config.js";

const uploadFoodImages = asyncHandler(async (req, res) => {
    const files = req.files;
    if (files && files.foodImage) {
      const imageUrls = files.foodImage.map(file => getFileUrl(file));
      res.status(200).json({
        message: "Food images uploaded successfully",
        imageUrls,
      });
    } else {
      res.status(400).json({
        message: "No images uploaded",
      });
    }
});

const CreateFoodInfo=asyncHandler(async(req , res)=>{
    if (!req.user || !req.user.isVerified) {
        res.status(403);
        throw new Error("Only Aadhaar-verified users can create food donations");
    }

    const {
        foodItemDetails,
        fullAddress,
        ngoPreference,
        city,
        contactPersonName,
        phoneNumber,
        email
    }=req.body;

    if(!foodItemDetails || !Array.isArray(foodItemDetails) || foodItemDetails.length === 0 || 
       !fullAddress || !city || !contactPersonName || !phoneNumber || !email){
        res.status(400);
        throw new Error("All required fields are missing");
    }

    for(const item of foodItemDetails) {
        item.donorId = req.user._id;
        
        if(item.imageUrl && !Array.isArray(item.imageUrl)) {
            res.status(400);
            throw new Error("imageUrl must be an array");
        }
        
        const expiryDate = new Date(item.expiryDate);
        if(isNaN(expiryDate.getTime())) {
            res.status(400);
            throw new Error("Invalid expiry date format");
        }
        
        if(item.quantity <= 0) {
            res.status(400);
            throw new Error("Quantity must be greater than 0");
        }
    }

    const contactDetails = {
        fullAddress,
        city,
        contactPersonName,
        phoneNumber,
        email
    };

    // Helper function to generate unique 6-character alphanumeric tokens
    const generateUniqueToken = async () => {
        let token;
        let exists = true;
        while (exists) {
            token = Math.random().toString(36).substring(2, 8).toUpperCase();
            const found = await FoodInfo.findOne({ verificationToken: token });
            if (!found) exists = false;
        }
        return token;
    };

    const verificationToken = await generateUniqueToken();

    const foodInfo=await FoodInfo.create({
        foodItemDetails,
        contactDetails,
        ngoPreference,
        verificationToken,
        status: 'pending'
    })
   return res.status(201).json({foodInfo,message:"Food info created successfully"});
})

const getFoodInfoById=asyncHandler(async(req ,res)=>{
    const {id}=req.params;
    const foodInfo=await FoodInfo.findById(id);
    if(!foodInfo){
        return res.status(404).json({message:"Food info not found"});
    }
    return res.status(200).json({foodInfo,message:"Food info fetched successfully"});
})

const updateFoodInfo=asyncHandler(async(req ,res)=>{
    const {id}=req.params;
    const {
        foodItemDetails,
        fullAddress,
        city,
        contactPersonName,
        phoneNumber,
        email,
        ngoPreference
    }=req.body;

    if(!foodItemDetails || !Array.isArray(foodItemDetails) || foodItemDetails.length === 0 || 
       !fullAddress || !city || !contactPersonName || !phoneNumber || !email){
        res.status(400);
        throw new Error("All required fields are missing");
    }

    for(const item of foodItemDetails) {
        if(!item.foodName || !item.quantity || !item.quantityType || !item.expiryDate || !item.category) {
            res.status(400);
            throw new Error("All food item details are required");
        }
    }

    const contactDetails = {
        fullAddress,
        city,
        contactPersonName,
        phoneNumber,
        email
    };

    const existingFoodInfo = await FoodInfo.findById(id);
    
    if (!existingFoodInfo) {
        res.status(404);
        throw new Error("Food info not found");
    }
    
    const foodInfo = await FoodInfo.findByIdAndUpdate(id, {
        foodItemDetails,
        contactDetails,
        ngoPreference,
        status: existingFoodInfo.status,
        isApproved: existingFoodInfo.isApproved,
        approvedBy: existingFoodInfo.approvedBy,
        approvedAt: existingFoodInfo.approvedAt,
        rejectedBy: existingFoodInfo.rejectedBy,
        rejectedAt: existingFoodInfo.rejectedAt,
        rejectedReason: existingFoodInfo.rejectedReason
    }, { new: true });
    
    return res.status(200).json({foodInfo,message:"Food info updated successfully"});
})

const deleteFoodInfo=asyncHandler(async(req ,res)=>{
    const {id}=req.params;
    const foodInfo=await FoodInfo.findByIdAndDelete(id);
    if(!foodInfo){
        return res.status(404).json({message:"Food info not found"});
    }
    return res.status(200).json({message:"Food info deleted successfully"});
})

const verifyDonationPickup = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { token } = req.body;

    if (!token) {
        res.status(400);
        throw new Error("Verification token is required");
    }

    let donation;
    if (id && id !== 'token-only') {
        donation = await FoodInfo.findById(id);
    } else {
        donation = await FoodInfo.findOne({ verificationToken: token.trim().toUpperCase() });
    }

    if (!donation) {
        res.status(404);
        throw new Error("Donation not found with the provided details");
    }

    if (!donation.verificationToken || donation.verificationToken.toUpperCase() !== token.trim().toUpperCase()) {
        res.status(400);
        throw new Error("Invalid verification token");
    }

    if (donation.status === 'done') {
        res.status(400);
        throw new Error("Donation is already completed");
    }

    // NGO Matching Check: If logged-in user is not admin, verify they represent the designated NGO
    if (!req.user.isAdmin) {
        // If donation was made as a general donation (random/unspecified), only admins can verify it
        if (!donation.ngoPreference || donation.ngoPreference.toString() === 'random') {
            res.status(403);
            throw new Error("This general donation is handled by Admin. Only Admins can verify this pickup.");
        }

        const userNgo = await Ngo.findOne({ registeredBy: req.user._id });
        if (!userNgo) {
            res.status(403);
            throw new Error("Only approved NGO representatives or Admins can verify donation pickups.");
        }
        if (!userNgo.isApproved) {
            res.status(403);
            throw new Error("Your NGO registration is pending approval. You cannot verify pickups yet.");
        }

        // If donation was made to a specific NGO, make sure it matches the scanning NGO
        if (donation.ngoPreference.toString() !== userNgo._id.toString()) {
            res.status(403);
            throw new Error("This donation is assigned to a different NGO. You are not authorized to verify it.");
        }
    }

    donation.status = 'done';
    donation.completedAt = new Date();
    await donation.save();

    res.status(200).json({
        message: "Donation verified and marked as completed successfully!",
        donation
    });
});

export {CreateFoodInfo,getFoodInfoById,updateFoodInfo,deleteFoodInfo,uploadFoodImages,verifyDonationPickup};





