import express from 'express';
import { uploadNgoDocuments } from '../utils/s3Config';
import router from 'express'
import { ngoDetailsController, uploadNgoDocumentsContrller } from '../controllers/ngoController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post("/aahaarNgoDocumentsUpload", uploadNgoDocuments.fields([
    { name: 'certificationOfRegistration', maxCount: 1 },
    { name: 'ownerPanCard', maxCount: 1 },
    { name: 'prevousWorkReport', maxCount: 1 },
]),protect, uploadNgoDocumentsContrller)
router.post("/aahaarNgoDetails", protect, ngoDetailsController)
export default router;