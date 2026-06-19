import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteMyNotification,
  registerFcmToken
} from '../controllers/notificationController.js';

const router = express.Router();

// Apply auth protection middleware to all notification endpoints
router.use(protect);

router.route('/')
  .get(getMyNotifications);

router.route('/read-all')
  .put(markAllNotificationsRead);

router.route('/fcm-token')
  .post(registerFcmToken);

router.route('/:id')
  .delete(deleteMyNotification);

router.route('/:id/read')
  .put(markNotificationRead);

export default router;
