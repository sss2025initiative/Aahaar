import React, { createContext, useState, useCallback, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext(null);

const STORAGE_KEY = 'aahaar_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const isAdmin = !!(user?.isAdmin);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/aahar/users/auth', { email, password });
      const userData = res.data;
      setUser(userData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      return { success: true, user: userData };
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Login failed. Please try again.';
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (formData) => {
    setLoading(true);
    try {
      const res = await api.post('/aahar/users/register', formData);
      const userData = res.data;
      setUser(userData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      return { success: true, user: userData };
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Registration failed. Please try again.';
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadAadhaar = useCallback(async (file) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('adharVerificationDocument', file);
      const res = await api.post('/aahar/users/user-adhar-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const newDocUrl = res.data?.filesUrls?.adharVerificationDocument;
      if (newDocUrl) {
        const updatedUser = { ...user, adharVerificationDocument: newDocUrl };
        setUser(updatedUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
        return { success: true, user: updatedUser };
      }
      return { success: false, error: 'Upload succeeded but file URL was not returned.' };
    } catch (err) {
      const msg = err.response?.data?.message || 'Upload failed. Please try again.';
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [user]);

  const sendAadhaarOTP = useCallback(async (aadhaarNumber) => {
    setLoading(true);
    try {
      const res = await api.post('/aahar/users/aadhaar-send-otp', { aadhaarNumber });
      return { success: true, message: res.data?.message || 'OTP sent successfully!' };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP. Please try again.';
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyAadhaarOTP = useCallback(async (aadhaarNumber, otp) => {
    setLoading(true);
    try {
      const res = await api.post('/aahar/users/aadhaar-verify-otp', { aadhaarNumber, otp });
      if (res.data?.success) {
        const updatedUser = res.data.user;
        setUser(updatedUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
        return { success: true, user: updatedUser };
      }
      return { success: false, error: res.data?.message || 'Verification failed.' };
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification failed. Please try again.';
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [user]);

  const logout = useCallback(async () => {
    try {
      await api.post('/aahar/users/logout');
    } catch {
      // ignore
    } finally {
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, login, register, uploadAadhaar, sendAadhaarOTP, verifyAadhaarOTP, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
