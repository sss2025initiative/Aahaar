import FoodInfo from "../models/foodInfoModel.js";
import Ngo from "../models/ngoModel.js";
import NgoFoodRequest from "../models/ngoFoodRequestModel.js";
import asyncHandler from "express-async-handler";
import { uploadFoodImages as uploadFoodImagesMiddleware, getFileUrl } from "../s3Config.js";
import User from "../models/userModel.js";
import { notify } from "../services/notification.service.js";

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

    // Helper function to generate unique 6-digit numeric verification code
    const generateUniqueToken = async () => {
        let token;
        let exists = true;
        while (exists) {
            token = Math.floor(100000 + Math.random() * 900000).toString();
            const found = await FoodInfo.findOne({ verificationToken: token });
            if (!found) exists = false;
        }
        return token;
    };

    const verificationToken = await generateUniqueToken();

    const isDirectDonation = ngoPreference && ngoPreference !== 'random';
    const initialStatus = isDirectDonation ? 'PENDING_NGO_ACCEPTANCE' : 'pending';

    const foodInfo=await FoodInfo.create({
        foodItemDetails,
        contactDetails,
        ngoPreference,
        verificationToken,
        status: initialStatus
    })

    await notify({
        receiverId: req.user._id,
        receiverRole: 'donor',
        title: 'Donation Submitted',
        message: isDirectDonation 
            ? 'Your food donation has been submitted directly to the preferred NGO.' 
            : 'Your food donation has been submitted and is pending review.',
        type: 'DONATION_CREATED',
        entityType: 'FoodInfo',
        entityId: foodInfo._id,
        priority: 'medium'
    });

    if (isDirectDonation) {
        const ngo = await Ngo.findById(ngoPreference);
        if (ngo && ngo.registeredBy) {
            await notify({
                receiverId: ngo.registeredBy,
                receiverRole: 'ngo',
                title: 'New Direct Donation Received',
                message: `You have received a new direct food donation from ${contactPersonName}. Please accept or reject it.`,
                type: 'NEW_DONATION_ASSIGNED',
                entityType: 'FoodInfo',
                entityId: foodInfo._id,
                priority: 'high'
            });
        }
        // Also notify admins of this direct donation activity
        const admins = await User.find({ isAdmin: true });
        for (const admin of admins) {
            await notify({
                receiverId: admin._id,
                receiverRole: 'admin',
                title: 'New Direct Food Donation',
                message: `A direct food donation has been submitted to NGO "${ngo?.ngoName || 'NGO'}".`,
                type: 'NEW_DONATION_SUBMITTED',
                entityType: 'FoodInfo',
                entityId: foodInfo._id,
                priority: 'medium'
            });
        }
    } else {
        const admins = await User.find({ isAdmin: true });
        for (const admin of admins) {
            await notify({
                receiverId: admin._id,
                receiverRole: 'admin',
                title: 'New Food Donation',
                message: 'A new food donation has been submitted for approval.',
                type: 'NEW_DONATION_SUBMITTED',
                entityType: 'FoodInfo',
                entityId: foodInfo._id,
                priority: 'high'
            });
        }
    }

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

    if (donation.status === 'done' || donation.status === 'COMPLETED') {
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

    donation.status = 'COMPLETED';
    donation.completedAt = new Date();
    
    // Save which NGO picked up this food donation
    if (!req.user.isAdmin) {
        const userNgo = await Ngo.findOne({ registeredBy: req.user._id });
        if (userNgo) {
            donation.pickedUpByNgo = userNgo._id;
        }
    }

    await donation.save();

    // Mark the corresponding NgoFoodRequest as completed (fulfilled)
    if (donation.verificationToken) {
        const request = await NgoFoodRequest.findOne({ verificationToken: donation.verificationToken.toUpperCase() });
        if (request && request.status !== 'fulfilled' && request.status !== 'COMPLETED') {
            request.status = 'COMPLETED';
            request.fulfilledAt = new Date();
            await request.save();

            // Notify the NGO representative who requested the food
            if (request.requestedBy) {
                await notify({
                    receiverId: request.requestedBy,
                    receiverRole: 'ngo',
                    title: 'Food Request Fulfilled',
                    message: 'Your NGO food request fulfillment has been verified and completed.',
                    type: 'FOOD_REQUEST_FULFILLED',
                    entityType: 'NgoFoodRequest',
                    entityId: request._id,
                    priority: 'medium'
                });
            }
        }
    }

    const donorId = donation.foodItemDetails?.[0]?.donorId;
    if (donorId) {
        await notify({
            receiverId: donorId,
            receiverRole: 'donor',
            title: 'Donation Completed',
            message: 'Your food donation pickup has been verified and marked as completed.',
            type: 'DONATION_COMPLETED',
            entityType: 'FoodInfo',
            entityId: donation._id,
            priority: 'medium'
        });
    }

    // Notify the picking-up NGO representative
    if (donation.pickedUpByNgo) {
        const ngo = await Ngo.findById(donation.pickedUpByNgo);
        if (ngo && ngo.registeredBy) {
            await notify({
                receiverId: ngo.registeredBy,
                receiverRole: 'ngo',
                title: 'Donation Pickup Verified',
                message: `You have successfully verified and completed the pickup for donation #${String(donation._id).slice(-10).toUpperCase()}.`,
                type: 'DONATION_COMPLETED',
                entityType: 'FoodInfo',
                entityId: donation._id,
                priority: 'medium'
            });
        }
    }

    // Notify all admins to trigger real-time dashboard updates
    const admins = await User.find({ isAdmin: true });
    for (const admin of admins) {
        await notify({
            receiverId: admin._id,
            receiverRole: 'admin',
            title: 'Donation Completed',
            message: `Food donation #${String(donation._id).slice(-10).toUpperCase()} has been successfully picked up and completed.`,
            type: 'DONATION_COMPLETED',
            entityType: 'FoodInfo',
            entityId: donation._id,
            priority: 'medium'
        });
    }

    res.status(200).json({
        message: "Donation verified and marked as completed successfully!",
        donation
    });
});

const getNgoAssignedDonations = asyncHandler(async (req, res) => {
    const userNgo = await Ngo.findOne({ registeredBy: req.user._id });
    if (!userNgo) {
        return res.status(200).json({
            donations: [],
            message: "No NGO associated with your account."
        });
    }

    const donations = await FoodInfo.find({
        $or: [
            { ngoPreference: userNgo._id },
            { pickedUpByNgo: userNgo._id }
        ]
    }).sort({ createdAt: -1 })
      .populate({
         path: 'foodItemDetails.donorId',
         select: 'firstName surname email phone'
      });

    return res.status(200).json({
        donations,
        message: "Assigned donations fetched successfully"
    });
});

const acceptDirectDonation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const donation = await FoodInfo.findById(id);

    if (!donation) {
        res.status(404);
        throw new Error("Donation not found");
    }

    if (donation.status !== 'PENDING_NGO_ACCEPTANCE') {
        res.status(400);
        throw new Error("Donation is not in pending NGO acceptance status");
    }

    const userNgo = await Ngo.findOne({ registeredBy: req.user._id });
    if (!userNgo) {
        res.status(403);
        throw new Error("Only approved NGO representatives can accept donations");
    }

    if (donation.ngoPreference.toString() !== userNgo._id.toString()) {
        res.status(403);
        throw new Error("This donation is assigned to a different NGO");
    }

    donation.status = 'NGO_ACCEPTED';
    await donation.save();

    // Notify donor
    const donorId = donation.foodItemDetails?.[0]?.donorId;
    if (donorId) {
        await notify({
            receiverId: donorId,
            receiverRole: 'donor',
            title: 'Donation Accepted',
            message: `Your donation has been accepted by ${userNgo.ngoName}.`,
            type: 'DONATION_APPROVED',
            entityType: 'FoodInfo',
            entityId: donation._id,
            priority: 'high'
        });
    }

    // Notify NGO
    await notify({
        receiverId: req.user._id,
        receiverRole: 'ngo',
        title: 'Donation Accepted',
        message: `You have successfully accepted the direct donation from ${donation.contactDetails?.contactPersonName}.`,
        type: 'DONATION_APPROVED',
        entityType: 'FoodInfo',
        entityId: donation._id,
        priority: 'medium'
    });

    // Notify Admins
    const admins = await User.find({ isAdmin: true });
    for (const admin of admins) {
        await notify({
            receiverId: admin._id,
            receiverRole: 'admin',
            title: 'Direct Donation Accepted',
            message: `NGO "${userNgo.ngoName}" has accepted the direct food donation from ${donation.contactDetails?.contactPersonName}.`,
            type: 'DONATION_APPROVED',
            entityType: 'FoodInfo',
            entityId: donation._id,
            priority: 'medium'
        });
    }

    res.status(200).json({
        message: "Donation accepted successfully!",
        donation
    });
});

const rejectDirectDonation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const donation = await FoodInfo.findById(id);

    if (!donation) {
        res.status(404);
        throw new Error("Donation not found");
    }

    if (donation.status !== 'PENDING_NGO_ACCEPTANCE') {
        res.status(400);
        throw new Error("Donation is not in pending NGO acceptance status");
    }

    const userNgo = await Ngo.findOne({ registeredBy: req.user._id });
    if (!userNgo) {
        res.status(403);
        throw new Error("Only approved NGO representatives can reject donations");
    }

    if (donation.ngoPreference.toString() !== userNgo._id.toString()) {
        res.status(403);
        throw new Error("This donation is assigned to a different NGO");
    }

    donation.status = 'rejected';
    donation.rejectedReason = rejectionReason || "Rejected by NGO";
    donation.rejectedBy = req.user._id;
    donation.rejectedAt = new Date();
    await donation.save();

    // Notify donor
    const donorId = donation.foodItemDetails?.[0]?.donorId;
    if (donorId) {
        await notify({
            receiverId: donorId,
            receiverRole: 'donor',
            title: 'Donation Rejected by NGO',
            message: `Your donation was rejected by ${userNgo.ngoName}. Reason: ${donation.rejectedReason}`,
            type: 'DONATION_REJECTED',
            entityType: 'FoodInfo',
            entityId: donation._id,
            priority: 'high'
        });
    }

    res.status(200).json({
        message: "Donation rejected successfully",
        donation
    });
});

export {
    CreateFoodInfo,
    getFoodInfoById,
    updateFoodInfo,
    deleteFoodInfo,
    uploadFoodImages,
    verifyDonationPickup,
    getNgoAssignedDonations,
    acceptDirectDonation,
    rejectDirectDonation
};





