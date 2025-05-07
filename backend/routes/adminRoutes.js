import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import isAdmin from "../middlewares/isAdmin.js";
import { 
  getAllUsers, 
  makeUserAdmin, 
  removeAdminPrivileges, 
  deleteUser,
  getPendingFoodDonations,
  approveFoodDonation,
  rejectFoodDonation
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
router.route('/food-donations/pending').get(getPendingFoodDonations);
router.route('/food-donations/:donationId/approve').put(approveFoodDonation);
router.route('/food-donations/:donationId/reject').put(rejectFoodDonation);

export default router;