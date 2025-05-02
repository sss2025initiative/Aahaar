import { authUser, logoutUser, registerUser } from "../controllers/userController.js";
import { protect } from "../middlewares/authMiddleware.js";
import express from "express";
const router = express.Router();

router.route("/register").post(registerUser);
router.post("/auth", authUser);
router.post("/logout", logoutUser);
export default router;