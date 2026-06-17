import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  createNgoFoodRequest,
  getMyNgoFoodRequests,
  getNgoStatus,
} from "../controllers/ngoFoodRequestController.js";

const router = express.Router();

router.use(protect);

// NGO food request routes
router.post("/create", createNgoFoodRequest);
router.get("/my-requests", getMyNgoFoodRequests);
router.get("/ngo-status", getNgoStatus);

export default router;
