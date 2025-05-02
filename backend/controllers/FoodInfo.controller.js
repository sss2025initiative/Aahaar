import FoodInfo from "../models/FoodInfo.js";
import asyncHandler from "../middlewares/asyncHandler.js";

//create FoodInfo
const createFoodInfo = asyncHandler(async (req, res) => {
    const { foodName, Category, quantity, unit, expiryDate, Description } = req.body;
    const foodInfo = await FoodInfo.create({
        foodName,
        Category,
        quantity,
        unit,
        expiryDate,
        Description,
    });
   return res.status(201).json({
        _id: foodInfo._id,
        foodName: foodInfo.foodName,
        Category: foodInfo.Category,
        quantity: foodInfo.quantity,
        unit: foodInfo.unit,
        expiryDate: foodInfo.expiryDate,
        Description: foodInfo.Description,
    });
});

//get all FoodInfo
const getAllFoodInfo = asyncHandler(async (req, res) => {
    const foodInfo = await FoodInfo.find();
    res.status(200).json(foodInfo);
});

//get single FoodInfo
const getFoodInfo = asyncHandler(async (req, res) => {
    const foodInfo = await FoodInfo.findById(req.params.id);
    res.status(200).json(foodInfo);
});

//update FoodInfo
const updateFoodInfo = asyncHandler(async (req, res) => {
    const foodInfo = await FoodInfo.findById(req.params.id);
    if (!foodInfo) {
        res.status(404);
        throw new Error("FoodInfo not found");
    }
    const updatedFoodInfo = await FoodInfo.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
    );
    res.status(200).json(updatedFoodInfo);
});

//delete FoodInfo
const deleteFoodInfo = asyncHandler(async (req, res) => {
    const foodInfo = await FoodInfo.findById(req.params.id);
    if (!foodInfo) {
        res.status(404);
        throw new Error("FoodInfo not found");
    }
    await foodInfo.remove();
    res.status(200).json({ message: "FoodInfo deleted" });
});

export { createFoodInfo, getAllFoodInfo, getFoodInfo, updateFoodInfo, deleteFoodInfo };


