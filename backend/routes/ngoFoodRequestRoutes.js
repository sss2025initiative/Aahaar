import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  createNgoFoodRequest,
  getMyNgoFoodRequests,
  getNgoStatus,
  fulfillMyNgoFoodRequest,
  getActiveNgoFoodRequests,
  acceptNgoFoodRequest,
  verifyNgoFoodRequestFulfillment,
  getMyAcceptedFulfillments,
} from "../controllers/ngoFoodRequestController.js";

const router = express.Router();

// Public routes
router.get("/active", getActiveNgoFoodRequests);

router.use(protect);

// NGO food request routes
router.post("/create", createNgoFoodRequest);
router.get("/my-requests", getMyNgoFoodRequests);
router.get("/ngo-status", getNgoStatus);
router.put("/:id/fulfill", fulfillMyNgoFoodRequest);
router.put("/:id/accept", acceptNgoFoodRequest);
router.put("/:id/verify-fulfillment", verifyNgoFoodRequestFulfillment);
router.get("/my-fulfillments", getMyAcceptedFulfillments);

export default router;
