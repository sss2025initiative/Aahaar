import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import store from '../store';
import { registerFcmToken } from '../store/slices/notificationSlice';

// Dynamic configuration check
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mock-auth-domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mock-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mock-storage-bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "mock-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "mock-app-id"
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";

let messaging = null;

try {
  // FCM requires browser service worker and Notification API support
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window) {
    const app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
  }
} catch (error) {
  console.warn("FCM client initialization bypassed/failed. Dynamic Dry-Run mode activated.", error);
}

export const requestFcmPermission = async () => {
  if (!messaging) {
    console.log("[FCM] Notifications not supported or messaging not initialized. (Dry-Run mode)");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('[FCM] Notification permission granted.');
      
      if (!VAPID_KEY) {
        console.warn("[FCM] VAPID Key is missing. Skipping token retrieval. Please set VITE_FIREBASE_VAPID_KEY.");
        return null;
      }

      // Register the service worker explicitly
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      
      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (currentToken) {
        console.log('[FCM] Token retrieved:', currentToken);
        // Register token with backend via Redux store
        store.dispatch(registerFcmToken(currentToken));
        return currentToken;
      } else {
        console.log('[FCM] No registration token available. Request permission to generate one.');
      }
    } else {
      console.log('[FCM] Unable to get permission to notify.');
    }
  } catch (error) {
    console.error('[FCM] Error requesting permission / getting token:', error);
  }
  return null;
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground message received:', payload);
      resolve(payload);
    });
  });
