import {createFoodInfo, getAllFoodInfo, getFoodInfo, updateFoodInfo, deleteFoodInfo } from '../controllers/FoodInfo.controller.js'
import express from 'express'

const router=express.Router();


router.route("/createFoodInfo",).post(createFoodInfo);
router.route("/getAllFoodInfo").get(getAllFoodInfo);
router.route("/getFoodInfo/:id").get(getFoodInfo);
router.route("/updateFoodInfo/:id").put(updateFoodInfo);
router.route("/deleteFoodInfo/:id").delete(deleteFoodInfo);
export default router;