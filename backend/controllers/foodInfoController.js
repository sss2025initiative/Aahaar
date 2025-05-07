import FoodInfo from "../models/foodInfoModel.js";
import asyncHandler from "express-async-handler";
const CreateFoodInfo = asyncHandler(async(req , res)=>{
    const {
        foodName,
        quantity,
        quantityType,
        expiryDate,
        packaging,
        imageUrl,
        category,
        status,
        fullAddress,
        contactPersonName,
        phoneNumber,
        email
    }=req.body;

    if(!foodName || !quantity || !quantityType || !expiryDate || !donorId || !category || 
       !fullAddress || !contactPersonName || !phoneNumber || !email){
        res.status(400);
        throw new Error("All required fields are missing");
    }

    const contactDetails = {
        fullAddress,
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
        donorId : req.user._id, 
        category,
        contactDetails,
        status
    })
   return res.status(201).json({foodInfo,message:"Food info created successfully"});
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
        status,
        fullAddress,
        contactPersonName,
        phoneNumber,
        email
    }=req.body;

    const contactDetails = {
        fullAddress,
        contactPersonName,
        phoneNumber,
        email
    };

    const foodInfo=await FoodInfo.findByIdAndUpdate(id,{
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
    }, { new: true });
    
    if (!foodInfo) {
        res.status(404);
        throw new Error("Food info not found");
    }
    
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

export {CreateFoodInfo,getFoodInfo,getFoodInfoById,updateFoodInfo,deleteFoodInfo};





