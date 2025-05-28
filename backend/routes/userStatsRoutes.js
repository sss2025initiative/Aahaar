//Routes for user stats
import express from "express";
import { getUserDashboardStats } from "../controllers/userStatsController.js";

const router = express.Router();

router.get("/user-dashboard-stats/:donorId", getUserDashboardStats);

export default router;
