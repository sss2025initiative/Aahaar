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
  triggerInReview,
  completeFoodDonation,
  getAllNgoFoodRequests,
  approveNgoFoodRequest,
  rejectNgoFoodRequest,
  fulfillNgoFoodRequest,
  toggleNgoRequestReview
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
router.route('/food-donations/:donationId/done').put(completeFoodDonation);
router.route('/getFoodInfoByCity').get(protect, getFoodInfoByCity);

// Admin NGO management routes
router.route('/ngos-based-city').get(getNgoBasedOnCity);
router.route('/approve-ngo/:id').put(approveNgo);
router.route('/verify-user/:id').put(verifyUser);
router.route('/users-based-city').get(getUsersBasedOnCity);

// Admin NGO food request management routes
router.route('/ngo-food-requests').get(getAllNgoFoodRequests);
router.route('/ngo-food-requests/:id/approve').put(approveNgoFoodRequest);
router.route('/ngo-food-requests/:id/reject').put(rejectNgoFoodRequest);
router.route('/ngo-food-requests/:id/fulfill').put(fulfillNgoFoodRequest);
router.route('/ngo-food-requests/:id/toggle-review').put(toggleNgoRequestReview);

export default router;