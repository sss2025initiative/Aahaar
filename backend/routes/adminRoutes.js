import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import isAdmin from "../middlewares/isAdmin.js";
import { 
  getAllUsers, 
  makeUserAdmin, 
  removeAdminPrivileges, 
  deleteUser,
  approveFoodDonation,
  rejectFoodDonation,
  approveNgo,
  getFoodInfoByCity,
  verifyUser,
  getUsersBasedOnCity,
  getNgoBasedOnCity,
  updateFoodInfoQuantity,
  triggerInReview
} from "../controllers/adminController.js";

const router = express.Router();

// Apply both protect and isAdmin middleware to all admin routes
router.use(protect);
router.use(isAdmin);

// Admin user management routes
router.route('/users').get(getAllUsers);
router.route('/users/:userId/make-admin').put(makeUserAdmin);
router.route('/users/:userId/remove-admin').put(removeAdminPrivileges);
router.route('/users/:userId').delete(deleteUser);

// Admin food donation management routes
router.route('/food-donations/:donationId/approve').put(approveFoodDonation);
router.route('/food-donations/:donationId/approve-inreview').put(triggerInReview);
router.route('/food-donations/:donationId/quantity-updatation').put(updateFoodInfoQuantity);
router.route('/food-donations/:donationId/reject').put(rejectFoodDonation);
router.route('/getFoodInfoByCity').get(protect,getFoodInfoByCity);


// Admin NGO management routes
router.route('/ngos-based-city').get(getNgoBasedOnCity);
router.route('/approve-ngo/:id').put(approveNgo);
router.route('/verify-user/:id').put(verifyUser);
router.route('/users-based-city').get(getUsersBasedOnCity);


export default router;