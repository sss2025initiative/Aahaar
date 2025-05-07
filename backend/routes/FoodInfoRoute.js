import {CreateFoodInfo,getFoodInfo,getFoodInfoByCity,getFoodInfoById,updateFoodInfo,deleteFoodInfo,uploadFoodImages} from "../controllers/foodInfoController.js"
import { protect } from "../middlewares/authMiddleware.js";
import express from "express";
import { uploadFoodImages } from "../s3Config.js";
const router = express.Router();

router.post("/uploadFoodImages", uploadFoodImages.fields([
    { name: 'foodImage', maxCount: 1 },
]), uploadFoodImages);
router.route('/createFoodInfo').post(protect,CreateFoodInfo);
router.route('/getFoodInfo').get(protect,getFoodInfo);
router.route('/getFoodInfoById/:id').get(protect,getFoodInfoById);
router.route('/getFoodInfoByCity/:city').get(protect,getFoodInfoByCity);
router.route('/updateFoodInfo/:id').put(protect,updateFoodInfo);
router.route('/deleteFoodInfo/:id').delete(protect,deleteFoodInfo);
export default router;
