import express from 'express';
import { uploadNgoDocuments } from '../s3Config.js';
import { ngoDetailsController, uploadNgoDocumentsContrller, getNgoDetailsBasedOnCity } from '../controllers/ngoController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post("/aahaarNgoDocumentsUpload", uploadNgoDocuments.fields([
    { name: 'certificationOfRegistration', maxCount: 1 },
    { name: 'ownerPanCard', maxCount: 1 },
    { name: 'prevousWorkReport', maxCount: 1 },
]),protect, uploadNgoDocumentsContrller)

router.post("/aahaarNgoDetails", protect, ngoDetailsController)
router.get("/city/:ngoCity", protect, getNgoDetailsBasedOnCity)

export default router;