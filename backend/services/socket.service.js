import { emitToUser } from '../sockets/socket.js';

/**
 * Sends a real-time notification to a connected user client via Socket.IO
 * @param {string} userId - Target User ID
 * @param {object} notification - Notification payload object
 */
export const sendRealtimeNotification = (userId, notification) => {
  return emitToUser(userId, 'notification', notification);
};
