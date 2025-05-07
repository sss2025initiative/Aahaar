import { authUser, logoutUser, registerUser, uploadAdharDocument } from "../controllers/userController.js";
import { protect } from "../middlewares/authMiddleware.js";
import express from "express";
const router = express.Router();

router.route("/register").post(registerUser);
router.post("/auth", authUser);
router.post("/logout", logoutUser);

router.post("/user-adhar-document", uploadDocumentsToS3.fields([
    { name: 'adharVerificationDocument', maxCount: 1 }
]),protect, uploadAdharDocument)

export default router;