import { authUser, logoutUser, registerUser } from "../controllers/userController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.route("/").post(registerUser);
router.post("/auth", authUser);
router.post("/logout", logoutUser);