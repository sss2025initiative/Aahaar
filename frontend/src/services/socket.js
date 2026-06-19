import { io } from 'socket.io-client';
import store from '../store';
import { addLiveNotification } from '../store/slices/notificationSlice';
import { showToast } from '../components/Toast';

let socket = null;

export const connectSocket = (userId) => {
  if (socket) return;

  // Connecting to the backend server URL
  socket = io('http://localhost:5001', {
    transports: ['websocket'],
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    // Join the personalized user notification room
    socket.emit('register', userId);
  });

  socket.on('notification', (notification) => {
    console.log('Received socket notification:', notification);
    // Dispatch to Redux store
    store.dispatch(addLiveNotification(notification));
    // Trigger global Toast alert
    showToast(`🔔 ${notification.title}: ${notification.message}`, 'info');
    
    // Dispatch custom event so active pages can update dynamically
    const event = new CustomEvent('notification-received', { detail: notification });
    window.dispatchEvent(event);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
