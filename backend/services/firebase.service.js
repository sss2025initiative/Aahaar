import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import dotenv from 'dotenv';
dotenv.config();

let isFirebaseInitialized = false;

try {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    let serviceAccount;
    // Check if configuration is an inline JSON string or a file path
    if (serviceAccountJson.trim().startsWith('{')) {
      serviceAccount = JSON.parse(serviceAccountJson);
    } else {
      serviceAccount = serviceAccountJson;
    }
    
    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount)
      });
    }
    isFirebaseInitialized = true;
    console.log("Firebase Admin SDK successfully initialized.");
  } else {
    console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT environment variable is missing. Firebase Push Notifications will run in DRY-RUN mode (logged in console).");
  }
} catch (err) {
  console.error("❌ Failed to initialize Firebase Admin SDK:", err);
}

/**
 * Sends a push notification via Firebase Cloud Messaging (FCM)
 * @param {string} token - Device registration token
 * @param {object} payload - Notification data payload (title, body, etc.)
 */
export const sendPushNotification = async (token, payload) => {
  if (!token) {
    return { success: false, reason: "No device token provided" };
  }

  const message = {
    token: token,
    notification: {
      title: payload.title,
      body: payload.body || payload.message
    },
    data: {
      type: payload.type || '',
      entityId: payload.entityId ? payload.entityId.toString() : '',
      entityType: payload.entityType || '',
      priority: payload.priority || 'medium'
    }
  };

  if (isFirebaseInitialized) {
    try {
      const response = await getMessaging().send(message);
      console.log(`FCM Notification sent successfully. Message ID: ${response}`);
      return { success: true, messageId: response };
    } catch (err) {
      console.error("FCM Send Error:", err);
      return { success: false, error: err.message || err };
    }
  } else {
    console.log(`[FIREBASE FCM DRY-RUN] Sending push payload to token: ${token}`);
    console.log("Payload:", JSON.stringify(message, null, 2));
    return { success: true, dryRun: true };
  }
};
