import { useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { AuthProvider, AuthContext } from './context/AuthContext';

import Navbar from './components/Navbar';
import Toast, { showToast } from './components/Toast';
import Chatbot from './components/Chatbot';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DonorDashboard from './pages/DonorDashboard';
import CreateDonation from './pages/CreateDonation';
import AdminDashboard from './pages/AdminDashboard';
import NgoRegistration from './pages/NgoRegistration';
import NgoDashboard from './pages/NgoDashboard';
import StatsPage from './pages/StatsPage';
import AboutPage from './pages/AboutPage';
import NotificationsPage from './pages/NotificationsPage';

import { connectSocket, disconnectSocket } from './services/socket';
import { requestFcmPermission } from './services/firebase';
import { fetchNotifications, clearNotifications } from './store/slices/notificationSlice';
import api from './api/axios';

import './index.css';
import './App.css';

function AppRoutes() {
  const { user } = useContext(AuthContext);
  const dispatch = useDispatch();

  useEffect(() => {
    if (user && user._id) {
      connectSocket(user._id);
      dispatch(fetchNotifications())
        .unwrap()
        .then((notifications) => {
          const unread = (notifications || []).filter(n => !n.isRead);
          if (unread.length > 0) {
            unread.forEach(n => {
              showToast(`🔔 ${n.title}: ${n.message}`, 'info');
            });
          }
        })
        .catch((err) => {
          console.error("Failed to load notifications on login:", err);
        });
      requestFcmPermission();
    } else {
      disconnectSocket();
      dispatch(clearNotifications());
    }
    return () => {
      disconnectSocket();
    };
  }, [user, dispatch]);

  // Periodic 5-minute check for pending processes
  useEffect(() => {
    if (!user) return;

    const runPendingCheck = async () => {
      try {
        if (user.isAdmin) {
          // Admin checks: pending NGO food requests and pending food donations
          const [resRequests, resDonations] = await Promise.all([
            api.get('/aahar/admin/ngo-food-requests'),
            api.get('/aahar/admin/getFoodInfoByCity')
          ]);
          const pendingReqs = (resRequests.data?.requests || []).filter(r => r.status === 'pending');
          const pendingDonations = (resDonations.data?.foodInfo || []).filter(d => d.status === 'pending');
          
          if (pendingReqs.length > 0 || pendingDonations.length > 0) {
            const parts = [];
            if (pendingReqs.length > 0) {
              parts.push(`${pendingReqs.length} pending NGO food request${pendingReqs.length > 1 ? 's' : ''}`);
            }
            if (pendingDonations.length > 0) {
              parts.push(`${pendingDonations.length} pending food donation${pendingDonations.length > 1 ? 's' : ''}`);
            }
            const message = `⚠️ Action Needed: You have ${parts.join(' and ')} awaiting your approval.`;
            showToast(message, 'warning');
          }
        } else {
          // Regular User or NGO representative checks
          let isNgoApproved = false;
          try {
            const resNgo = await api.get('/aahar/ngo-food-requests/ngo-status');
            const ngo = resNgo.data?.ngo;
            if (ngo) {
              if (!ngo.isApproved) {
                showToast('ℹ️ NGO Status: Your NGO registration is currently pending admin approval.', 'info');
              } else {
                isNgoApproved = true;
              }
            }
          } catch {
            // ignore
          }

          if (isNgoApproved) {
            // Check for direct donations assigned to their NGO that are approved and ready for pickup
            try {
              const resAssigned = await api.get('/aahar/foodInfo/my-assigned-donations');
              const assigned = resAssigned.data?.donations || [];
              const pendingPickups = assigned.filter(d => d.status === 'approved');
              if (pendingPickups.length > 0) {
                showToast(`🚚 Pickup Alert: You have ${pendingPickups.length} approved direct food donation${pendingPickups.length > 1 ? 's' : ''} ready for pickup.`, 'warning');
              }
            } catch {
              // ignore
            }
          } else {
            // Regular User / Donor checks
            // 1. Check if Aadhaar is uploaded but not verified yet
            if (!user.isVerified && user.adharVerificationDocument) {
              showToast('ℹ️ Verification Update: Your Aadhaar document review is in progress by Admin.', 'info');
            }

            // 2. Check if there are active NGO food requests nearby
            const resActive = await api.get('/aahar/ngo-food-requests/active');
            const activeList = resActive.data?.requests || [];
            const donorId = user._id || user.id;
            const filteredActive = activeList.filter(r => r.requestedBy !== donorId && r.requestedBy?._id !== donorId);
            
            if (filteredActive.length > 0) {
              showToast(`🌾 Food Request Alert: There are ${filteredActive.length} active NGO food needs in your city. Fulfill a request to support the community!`, 'info');
            }
          }
        }
      } catch (err) {
        console.error('Failed to run periodic pending processes check:', err);
      }
    };

    // Run check immediately on mount/login
    runPendingCheck();

    // Set interval for every 5 minutes (300000 ms)
    const interval = setInterval(runPendingCheck, 300000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/ngo-register" element={<NgoRegistration />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/about" element={<AboutPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DonorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/donate"
          element={
            <ProtectedRoute>
              <CreateDonation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/ngo-dashboard"
          element={
            <ProtectedRoute>
              <NgoDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
      <Chatbot />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
