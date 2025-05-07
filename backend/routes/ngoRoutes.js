import express from 'express';
import { uploadDocumentsToS3 } from '../s3Config.js';
import { ngoDetailsController, uploadNgoDocumentsContrller } from '../controllers/ngoController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post("/aahaarNgoDocumentsUpload", uploadDocumentsToS3.fields([
    { name: 'certificationOfRegistration', maxCount: 1 },
    { name: 'ownerPanCard', maxCount: 1 },
    { name: 'prevousWorkReport', maxCount: 1 },
]),protect, uploadNgoDocumentsContrller)

router.post("/aahaarNgoDetails", protect, ngoDetailsController)
export default router;