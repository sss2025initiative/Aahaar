import { configureStore } from '@reduxjs/toolkit';
import notificationReducer from './slices/notificationSlice';

export const store = configureStore({
  reducer: {
    notifications: notificationReducer,
  },
});

export default store;
