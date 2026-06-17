/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useCallback} from 'react';
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

  const uploadAadhaar = useCallback(async (file, currentUser = null) => {
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
        const activeUser = currentUser || user;
        const updatedUser = { ...activeUser, adharVerificationDocument: newDocUrl };
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
    <AuthContext.Provider value={{ user, isAdmin, loading, login, register, uploadAadhaar, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
