import {CreateFoodInfo,getFoodInfo,getFoodInfoById,updateFoodInfo,deleteFoodInfo} from "../controllers/foodInfoController.js"
import { protect } from "../middlewares/authMiddleware.js";
import express from "express";
const router = express.Router();

router.route('/createFoodInfo').post(protect,CreateFoodInfo);
router.route('/getFoodInfo').get(protect,getFoodInfo);
router.route('/getFoodInfoById/:id').get(protect,getFoodInfoById);
router.route('/updateFoodInfo/:id').put(protect,updateFoodInfo);
router.route('/deleteFoodInfo/:id').delete(protect,deleteFoodInfo);

export default router;
