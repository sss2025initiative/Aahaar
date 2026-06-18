import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  createNgoFoodRequest,
  getMyNgoFoodRequests,
  getNgoStatus,
  fulfillMyNgoFoodRequest,
} from "../controllers/ngoFoodRequestController.js";

const router = express.Router();

router.use(protect);

// NGO food request routes
router.post("/create", createNgoFoodRequest);
router.get("/my-requests", getMyNgoFoodRequests);
router.get("/ngo-status", getNgoStatus);
router.put("/:id/fulfill", fulfillMyNgoFoodRequest);

export default router;
