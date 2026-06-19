import {CreateFoodInfo,getFoodInfoById,updateFoodInfo,deleteFoodInfo,uploadFoodImages as uploadFoodImagesController,verifyDonationPickup,getNgoAssignedDonations,acceptDirectDonation,rejectDirectDonation} from "../controllers/foodInfoController.js"
import { protect } from "../middlewares/authMiddleware.js";
import express from "express";
import { uploadFoodImages } from "../s3Config.js";
const router = express.Router();

router.post("/uploadFoodImages", uploadFoodImages.fields([
    { name: 'foodImage', maxCount: 1 },
]), uploadFoodImagesController);
router.route('/createFoodInfo').post(protect,CreateFoodInfo);
router.route('/getFoodInfoById/:id').get(protect,getFoodInfoById);
router.route('/updateFoodInfo/:id').put(protect,updateFoodInfo);
router.route('/deleteFoodInfo/:id').delete(protect,deleteFoodInfo);
router.route('/verify-pickup/:id').put(protect,verifyDonationPickup);
router.route('/my-assigned-donations').get(protect,getNgoAssignedDonations);
router.route('/accept-donation/:id').put(protect,acceptDirectDonation);
router.route('/reject-donation/:id').put(protect,rejectDirectDonation);
export default router;
