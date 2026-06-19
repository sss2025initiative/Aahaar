import Notification from '../models/Notification.js';
import User from '../models/userModel.js';
import { sendRealtimeNotification } from './socket.service.js';
import { sendPushNotification } from './firebase.service.js';
import { sendEmailNotification } from './email.service.js';
import { sendSMSNotification } from './sms.service.js';

/**
 * Orchestrates and dispatches a notification across specified communication channels
 * @param {object} params
 * @param {string} params.receiverId - Recipient User ID
 * @param {string} params.receiverRole - Recipient role (donor, ngo, admin, volunteer)
 * @param {string} [params.senderId] - Optional sender User ID
 * @param {string} params.title - Alert Title
 * @param {string} params.message - Alert Content Message
 * @param {string} params.type - Notification Event Code Type
 * @param {string} params.entityType - Database Entity Category (Donation, NgoRequest, etc.)
 * @param {string} [params.entityId] - Ref ID of target entity
 * @param {string} [params.priority] - low, medium, high
 * @param {object} [params.metadata] - Key-value pair extensions
 * @param {string[]} [params.channels] - Target dispatch channels ['inApp', 'push', 'email', 'sms']
 */
export const notify = async (params) => {
  const {
    receiverId,
    receiverRole,
    senderId,
    title,
    message,
    type,
    entityType,
    entityId,
    priority = 'medium',
    metadata = {},
    channels = ['inApp', 'push', 'sms']
  } = params;

  if (!receiverId) {
    throw new Error("Missing receiverId parameter in notification orchestration call");
  }

  const results = {};

  try {
    // 1. Persist notification in database and emit Socket event for real-time delivery
    if (channels.includes('inApp')) {
      const dbNotification = await Notification.create({
        receiverId,
        receiverRole,
        senderId,
        title,
        message,
        type,
        entityType,
        entityId,
        priority,
        metadata,
        isRead: false
      });
      results.dbRecord = dbNotification;

      // Emit live Socket event to user's personalized room
      const socketSuccess = sendRealtimeNotification(receiverId, dbNotification);
      results.socketDispatched = socketSuccess;
    }

    // Fetch user details for offline pushes and email integrations
    const receiver = await User.findById(receiverId);
    if (receiver) {
      // 2. Dispatch push notification via FCM
      if (channels.includes('push') && receiver.fcmToken) {
        const pushResult = await sendPushNotification(receiver.fcmToken, {
          title,
          body: message,
          type,
          entityId,
          entityType,
          priority
        });
        results.pushDispatched = pushResult;
      } else if (channels.includes('push')) {
        results.pushDispatched = { success: false, reason: "User has no registered device fcmToken" };
      }

      // 3. Dispatch email notification (Future-pluggable stub)
      if (channels.includes('email') && receiver.email) {
        const emailResult = await sendEmailNotification(
          receiver.email,
          title,
          `<p>${message}</p>`
        );
        results.emailDispatched = emailResult;
      }

      // 4. Dispatch SMS notification to user phone number
      if (channels.includes('sms') && receiver.phone) {
        const smsResult = await sendSMSNotification(
          receiver.phone,
          `${title}: ${message}`
        );
        results.smsDispatched = smsResult;
      } else if (channels.includes('sms')) {
        results.smsDispatched = { success: false, reason: "User has no registered phone number" };
      }
    }
  } catch (err) {
    console.error("Failed to route and execute notification triggers:", err);
  }

  return results;
};

/**
 * Fetch notifications list for a specific user
 */
export const getUserNotifications = async (userId, filters = {}, options = {}) => {
  const query = { receiverId: userId, ...filters };
  const { limit = 20, skip = 0 } = options;
  return await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(Number(skip))
    .limit(Number(limit));
};

/**
 * Mark a specific notification as read
 */
export const markAsRead = async (notificationId, userId) => {
  return await Notification.findOneAndUpdate(
    { _id: notificationId, receiverId: userId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
};

/**
 * Mark all notifications as read for a specific user
 */
export const markAllAsRead = async (userId) => {
  return await Notification.updateMany(
    { receiverId: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

/**
 * Delete a specific notification record
 */
export const deleteNotification = async (notificationId, userId) => {
  return await Notification.findOneAndDelete({ _id: notificationId, receiverId: userId });
};
