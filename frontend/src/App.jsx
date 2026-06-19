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

  // Periodic checks: pending items + critical NGO request alerts
  useEffect(() => {
    if (!user) return;

    // Track last shown critical alerts to avoid spamming same request
    const shownCriticalIds = new Set();

    const runPendingCheck = async () => {
      try {
        if (user.isAdmin) {
          const [resRequests, resDonations] = await Promise.all([
            api.get('/aahar/admin/ngo-food-requests'),
            api.get('/aahar/admin/getFoodInfoByCity')
          ]);
          const pendingReqs = (resRequests.data?.requests || []).filter(r => r.status === 'pending');
          const pendingDonations = (resDonations.data?.foodInfo || []).filter(d => d.status === 'pending');
          if (pendingReqs.length > 0 || pendingDonations.length > 0) {
            const parts = [];
            if (pendingReqs.length > 0) parts.push(`${pendingReqs.length} pending NGO food request${pendingReqs.length > 1 ? 's' : ''}`);
            if (pendingDonations.length > 0) parts.push(`${pendingDonations.length} pending food donation${pendingDonations.length > 1 ? 's' : ''}`);
            showToast(`⚠️ Action Needed: You have ${parts.join(' and ')} awaiting your approval.`, 'warning');
          }
        } else {
          let isNgoApproved = false;
          try {
            const resNgo = await api.get('/aahar/ngo-food-requests/ngo-status');
            const ngo = resNgo.data?.ngo;
            if (ngo) {
              isNgoApproved = ngo.isApproved;
              if (!ngo.isApproved) {
                showToast('ℹ️ NGO Status: Your NGO registration is currently pending admin approval.', 'info');
              }
            }
          } catch { /* ignore */ }

          if (isNgoApproved) {
            const resAssigned = await api.get('/aahar/foodInfo/my-assigned-donations');
            const assigned = resAssigned.data?.donations || [];
            const pendingAccept = assigned.filter(d => {
              const s = (d.status || '').replace(/_/g, '').toUpperCase();
              return s === 'PENDINGNGOACCEPTANCE';
            });
            const readyPickup = assigned.filter(d => {
              const s = (d.status || '').replace(/_/g, '').toUpperCase();
              return s === 'NGOACCEPTED' || s === 'APPROVED' || s === 'REQUESTACCEPTED';
            });
            if (pendingAccept.length > 0) {
              showToast(`🎁 ${pendingAccept.length} direct donation${pendingAccept.length > 1 ? 's' : ''} awaiting your acceptance in NGO Portal → Direct Donations.`, 'warning');
            }
            if (readyPickup.length > 0) {
              showToast(`🚚 ${readyPickup.length} donation${readyPickup.length > 1 ? 's are' : ' is'} accepted and ready for pickup. Verify on NGO Portal.`, 'info');
            }
          } else {
            if (!user.isVerified && user.adharVerificationDocument) {
              showToast('ℹ️ Verification Update: Your Aadhaar document review is in progress by Admin.', 'info');
            }
            const resActive = await api.get('/aahar/ngo-food-requests/active');
            const activeList = resActive.data?.requests || [];
            const donorId = user._id || user.id;
            const filteredActive = activeList.filter(r => r.requestedBy !== donorId && r.requestedBy?._id !== donorId);
            if (filteredActive.length > 0) {
              showToast(`🌾 ${filteredActive.length} active NGO food need${filteredActive.length > 1 ? 's' : ''} in your area. Help fulfill a request!`, 'info');
            }
          }
        }
      } catch (err) {
        console.error('Periodic check error:', err);
      }
    };

    // Critical NGO alert: runs every 1 minute, only for critical urgency requests
    const runCriticalCheck = async () => {
      try {
        const res = await api.get('/aahar/ngo-food-requests/active');
        const all = res.data?.requests || [];
        const critical = all.filter(r => r.urgencyLevel === 'critical' || r.urgencyLevel === 'high');
        critical.forEach(r => {
          if (!shownCriticalIds.has(r._id)) {
            shownCriticalIds.add(r._id);
            const ngoName = r.ngoId?.ngoName || 'An NGO';
            const items = (r.foodItemsNeeded || []).map(i => `${i.foodName} (${i.quantity}${i.quantityType})`).join(', ');
            showToast(
              `🚨 CRITICAL: ${ngoName} urgently needs food — ${items}. Help now!`,
              r.urgencyLevel === 'critical' ? 'error' : 'warning',
              8000
            );
          }
        });
        // Clear IDs that are no longer active so they can re-alert next cycle
        const activeIds = new Set(critical.map(r => r._id));
        shownCriticalIds.forEach(id => { if (!activeIds.has(id)) shownCriticalIds.delete(id); });
      } catch { /* ignore */ }
    };

    runPendingCheck();
    runCriticalCheck();

    const pendingInterval = setInterval(runPendingCheck, 300000); // 5 minutes
    const criticalInterval = setInterval(runCriticalCheck, 60000);  // 1 minute
    return () => {
      clearInterval(pendingInterval);
      clearInterval(criticalInterval);
    };
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
