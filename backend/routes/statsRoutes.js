import express from "express";
import { getStats } from "../controllers/statsController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.route("/stats").get(protect, getStats);
export default router;