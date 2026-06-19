import asyncHandler from '../middlewares/asyncHandler.js';
import * as notificationService from '../services/notification.service.js';
import User from '../models/userModel.js';

// @desc    Get current user's notifications
// @route   GET /aahar/notifications
// @access  Private
export const getMyNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { type, isRead, limit = 20, skip = 0 } = req.query;

  const filters = {};
  if (type) {
    filters.type = type;
  }
  if (isRead !== undefined) {
    filters.isRead = isRead === 'true';
  }

  const notifications = await notificationService.getUserNotifications(userId, filters, { limit, skip });
  res.status(200).json(notifications);
});

// @desc    Mark a notification as read
// @route   PUT /aahar/notifications/:id/read
// @access  Private
export const markNotificationRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const notificationId = req.params.id;

  const notification = await notificationService.markAsRead(notificationId, userId);
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found or access denied');
  }

  res.status(200).json(notification);
});

// @desc    Mark all notifications as read for current user
// @route   PUT /aahar/notifications/read-all
// @access  Private
export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  await notificationService.markAllAsRead(userId);
  res.status(200).json({ message: 'All notifications marked as read' });
});

// @desc    Delete a specific notification
// @route   DELETE /aahar/notifications/:id
// @access  Private
export const deleteMyNotification = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const notificationId = req.params.id;

  const notification = await notificationService.deleteNotification(notificationId, userId);
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found or access denied');
  }

  res.status(200).json({ message: 'Notification deleted successfully' });
});

// @desc    Register or update user FCM token
// @route   POST /aahar/notifications/fcm-token
// @access  Private
export const registerFcmToken = asyncHandler(async (req, res) => {
  const { fcmToken } = req.body;
  
  if (!fcmToken) {
    res.status(400);
    throw new Error('fcmToken is required');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.fcmToken = fcmToken;
  await user.save();

  res.status(200).json({ message: 'FCM Token registered successfully' });
});
