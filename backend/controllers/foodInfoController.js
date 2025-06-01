import FoodInfo from "../models/foodInfoModel.js";
import asyncHandler from "express-async-handler";
import { uploadFoodImages as uploadFoodImagesMiddleware } from "../s3Config.js";

const uploadFoodImages = asyncHandler(async (req, res) => {
    const files = req.files;
    if (files && files.foodImage) {
      const imageUrls = files.foodImage.map(file => file.location);
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

    const foodInfo=await FoodInfo.create({
        foodItemDetails,
        contactDetails,
        ngoPreference,
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

export {CreateFoodInfo,getFoodInfoById,updateFoodInfo,deleteFoodInfo,uploadFoodImages};





