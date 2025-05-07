import FoodInfo from "../models/foodInfoModel.js";
import asyncHandler from "express-async-handler";
import upload from "../middlewares/upload.js";

// @desc    Upload food Images
const uploadFoodImages = asyncHandler(async (req, res) => {
    const files = req.files;
    if (files) {
      const imageUrl = files.foodImage?.[0]?.location;
      res.status(200).json({
        message: "Food image uploaded successfully",
        imageUrl,
      });
    } else {
      res.status(400).json({
        message: "No image uploaded",
      });
    }
  });

const CreateFoodInfo=asyncHandler(async(req , res)=>{
    const {
        foodName,
        quantity,
        quantityType,
        expiryDate,
        packaging,
        imageUrl,
        donorId,
        category,
        status,
        fullAddress,
        city,
        contactPersonName,
        phoneNumber,
        email
    }=req.body;

    if(!foodName || !quantity || !quantityType || !expiryDate || !donorId || !category || 
       !fullAddress || !city || !contactPersonName || !phoneNumber || !email){
        res.status(400);
        throw new Error("All required fields are missing");
    }

    const contactDetails = {
        fullAddress,
        city,
        contactPersonName,
        phoneNumber,
        email
    };

    const foodInfo=await FoodInfo.create({
        foodName,
        quantity,
        quantityType,
        expiryDate,
        packaging,
        imageUrl,
        donorId,
        category,
        contactDetails,
        status
    })
   return res.status(201).json({foodInfo,message:"Food info created successfully"});
})

// @desc    Get food info by city
const getFoodInfoByCity=asyncHandler(async(req ,res)=>{
    const {city}=req.params;
    const foodInfo=await FoodInfo.find({city});
    if(!foodInfo){
        return res.status(404).json({message:"No food info found"});
    }
    return res.status(200).json({foodInfo,message:"Food info fetched successfully"});
})

const getFoodInfo=asyncHandler(async(req ,res)=>{
    const foodInfo=await FoodInfo.find();
    if(!foodInfo){
        return res.status(404).json({message:"No food info found"});
    }
    return res.status(200).json({foodInfo,message:"Food info fetched successfully"});
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
        foodName,
        quantity,
        quantityType,
        expiryDate,
        packaging,
        imageUrl,
        donorId,
        category,
        fullAddress,
        city,
        contactPersonName,
        phoneNumber,
        email
    }=req.body;

    const contactDetails = {
        fullAddress,
        city,
        contactPersonName,
        phoneNumber,
        email
    };

    // Find the food info first to preserve admin-only fields
    const existingFoodInfo = await FoodInfo.findById(id);
    
    if (!existingFoodInfo) {
        res.status(404);
        throw new Error("Food info not found");
    }
    
    // Only update fields that regular users are allowed to update
    const foodInfo = await FoodInfo.findByIdAndUpdate(id, {
        foodName,
        quantity,
        quantityType,
        expiryDate,
        packaging,
        imageUrl,
        donorId,
        category,
        contactDetails,
        // Preserve admin-controlled fields
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

export {CreateFoodInfo,getFoodInfo,getFoodInfoByCity,getFoodInfoById,updateFoodInfo,deleteFoodInfo,uploadFoodImages};





