import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axios';
import { showToast } from '../components/Toast';
import { Html5QrcodeScanner } from 'html5-qrcode';

const FOOD_CATEGORIES = [
  'Fruits', 'Vegetables', 'Bakery', 'Dairy', 'Cooked Meals',
  'Beverages', 'Packaged Food', 'Grains', 'Others'
];

const URGENCY_COLORS = {
  low: { bg: 'rgba(6,182,212,0.12)', color: 'var(--color-teal)', label: 'Low' },
  medium: { bg: 'rgba(234,179,8,0.12)', color: 'var(--color-yellow)', label: 'Medium' },
  high: { bg: 'rgba(249,115,22,0.12)', color: 'var(--color-orange)', label: 'High' },
  critical: { bg: 'rgba(239,68,68,0.12)', color: 'var(--color-red)', label: 'Critical' },
};

const REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'fulfilled'];

function RequestStatusBadge({ status }) {
  const map = {
    pending: { bg: 'rgba(234,179,8,0.15)', color: '#fbbf24', icon: '⏳', label: 'Pending Review' },
    approved: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', icon: '✅', label: 'Approved' },
    rejected: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', icon: '❌', label: 'Rejected' },
    fulfilled: { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa', icon: '🚚', label: 'Completed' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700,
      background: s.bg, color: s.color,
    }}>
      {s.icon} {s.label}
    </span>
  );
}

function EmptyIcon({ icon, title, text, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__text">{text}</p>
      {action}
    </div>
  );
}

function FoodItemRow({ item, idx, onRemove, onChange }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', gap: 10,
      alignItems: 'center', padding: '12px 16px',
      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)', transition: 'all 0.2s'
    }}>
      <input
        className="form-input"
        style={{ marginBottom: 0 }}
        placeholder={`Food item ${idx + 1} name`}
        value={item.foodName}
        onChange={e => onChange(idx, 'foodName', e.target.value)}
        required
      />
      <input
        className="form-input"
        style={{ marginBottom: 0 }}
        type="number"
        placeholder="Qty"
        min="1"
        value={item.quantity}
        onChange={e => onChange(idx, 'quantity', e.target.value)}
        required
      />
      <select
        className="form-input"
        style={{ marginBottom: 0 }}
        value={item.quantityType}
        onChange={e => onChange(idx, 'quantityType', e.target.value)}
      >
        {['kg', 'g', 'ml', 'l', 'pcs'].map(u => <option key={u} value={u}>{u}</option>)}
      </select>
      <select
        className="form-input"
        style={{ marginBottom: 0 }}
        value={item.category}
        onChange={e => onChange(idx, 'category', e.target.value)}
      >
        <option value="">-- Category --</option>
        {FOOD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      {idx > 0 && (
        <button
          type="button"
          onClick={() => onRemove(idx)}
          style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            color: 'var(--color-red)', borderRadius: 'var(--radius-sm)',
            padding: '8px 10px', cursor: 'pointer', fontSize: '0.85rem'
          }}
        >✕</button>
      )}
    </div>
  );
}

function QrScannerComponent({ onScanSuccess, onScanError }) {
  useEffect(() => {
    const html5QrcodeScanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0
      },
      /* verbose= */ false
    );

    html5QrcodeScanner.render(onScanSuccess, onScanError);

    return () => {
      html5QrcodeScanner.clear().catch(err => {
        console.warn("Failed to clear html5QrcodeScanner:", err);
      });
    };
  }, [onScanSuccess, onScanError]);

  return (
    <div style={{ width: '100%', maxWidth: 350, margin: '0 auto' }}>
      <div id="reader" style={{ width: '100%', borderRadius: 12, overflow: 'hidden', border: 'none' }} />
    </div>
  );
}

export default function NgoDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [ngo, setNgo] = useState(null);
  const [requests, setRequests] = useState([]);
  const [assignedDonations, setAssignedDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview'); // overview | request | donations | history
  const [statusFilter, setStatusFilter] = useState('all');
  const [donationStatusFilter, setDonationStatusFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  
  // Verification Scanner States
  const [scannerOpen, setScannerOpen] = useState(false);
  const [verifyTab, setVerifyTab] = useState('scan');
  const [manualToken, setManualToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [verifyingRequestId, setVerifyingRequestId] = useState(null);

  // Form state
  const emptyItem = { foodName: '', quantity: '', quantityType: 'kg', category: '' };
  const [foodItems, setFoodItems] = useState([{ ...emptyItem }]);
  const [form, setForm] = useState({
    contactPersonName: user?.firstName ? `${user.firstName} ${user.surname || ''}`.trim() : '',
    phoneNumber: user?.phone || '',
    email: user?.email || '',
    deliveryAddress: '',
    city: user?.city || '',
    purpose: '',
    urgencyLevel: 'medium',
    numberOfBeneficiaries: '',
  });

  // Used for manual refreshes (refresh button, post-submit reload)
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resRequests, resDonations] = await Promise.all([
        api.get('/aahar/ngo-food-requests/my-requests'),
        api.get('/aahar/foodInfo/my-assigned-donations')
      ]);
      setNgo(resRequests.data?.ngo || null);
      setRequests(resRequests.data?.requests || []);
      setAssignedDonations(resDonations.data?.donations || []);
    } catch {
      showToast('Could not load NGO data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVerifyPickup = async (donationId, token) => {
    setVerifying(true);
    try {
      const url = donationId ? `/aahar/foodInfo/verify-pickup/${donationId}` : `/aahar/foodInfo/verify-pickup/token-only`;
      const res = await api.put(url, { token });
      showToast(res.data?.message || 'Pickup verified successfully!', 'success');
      setScannedData(res.data?.donation || true);
      fetchData();
    } catch (err) {
      if (!donationId) {
        // Fallback to checking as an NGO food request fulfillment
        try {
          const resReq = await api.put('/aahar/ngo-food-requests/token-only/verify-fulfillment', { token });
          showToast(resReq.data?.message || 'Fulfillment verified successfully!', 'success');
          setScannedData(resReq.data?.request || true);
          fetchData();
          return;
        } catch (err2) {
          showToast(err2.response?.data?.message || err.response?.data?.message || 'Verification failed.', 'error');
        }
      } else {
        showToast(err.response?.data?.message || 'Verification failed. Please check the token.', 'error');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyRequestFulfillment = async (requestId, token) => {
    setVerifying(true);
    try {
      const url = requestId ? `/aahar/ngo-food-requests/${requestId}/verify-fulfillment` : `/aahar/ngo-food-requests/token-only/verify-fulfillment`;
      const res = await api.put(url, { token });
      showToast(res.data?.message || 'Fulfillment verified successfully!', 'success');
      setScannedData(res.data?.request || true);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Verification failed. Please check the token.', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleAcceptDonation = async (id) => {
    try {
      await api.put(`/aahar/foodInfo/accept-donation/${id}`);
      showToast('Donation accepted successfully! 🎉', 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to accept donation', 'error');
    }
  };

  const handleRejectDonation = async (id) => {
    const reason = prompt("Please enter the reason for rejection (optional):");
    if (reason === null) return; // user cancelled
    try {
      await api.put(`/aahar/foodInfo/reject-donation/${id}`, { rejectionReason: reason });
      showToast('Donation rejected', 'info');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject donation', 'error');
    }
  };

  // Initial load — inlined to satisfy React Compiler (no external setState call in effect body)
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [resRequests, resDonations] = await Promise.all([
          api.get('/aahar/ngo-food-requests/my-requests'),
          api.get('/aahar/foodInfo/my-assigned-donations')
        ]);
        if (active) {
          setNgo(resRequests.data?.ngo || null);
          setRequests(resRequests.data?.requests || []);
          setAssignedDonations(resDonations.data?.donations || []);
        }
      } catch {
        if (active) showToast('Could not load NGO data', 'error');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; }; // cleanup: ignore stale responses
  }, []);

  // Listen for socket notification events to trigger real-time dashboard data refresh
  useEffect(() => {
    const handleNotification = (e) => {
      const notification = e.detail;
      // Refresh NGO requests when a request is accepted, approved, rejected, or fulfilled
      if (
        notification &&
        (notification.type === 'FOOD_REQUEST_ACCEPTED' ||
         notification.type === 'FOOD_REQUEST_FULFILLED' ||
         notification.type === 'FOOD_REQUEST_APPROVED' ||
         notification.type === 'FOOD_REQUEST_REJECTED' ||
         notification.type === 'DONATION_APPROVED' ||
         notification.type === 'DONATION_COMPLETED' ||
         notification.type === 'NEW_DONATION_ASSIGNED' ||
         notification.type === 'DONATION_CREATED' ||
         notification.type === 'DONATION_REJECTED')
      ) {
        fetchData();
      }
    };
    window.addEventListener('notification-received', handleNotification);
    return () => {
      window.removeEventListener('notification-received', handleNotification);
    };
  }, [fetchData]);

  const handleLogout = async () => {
    await logout();
    showToast('Logged out', 'success');
    navigate('/');
  };

  // Food item handlers
  const addItem = () => setFoodItems(prev => [...prev, { ...emptyItem }]);
  const removeItem = (idx) => setFoodItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx, field, val) => {
    setFoodItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };

  const handleFormChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();

    // Validate food items
    for (const item of foodItems) {
      if (!item.foodName.trim()) { showToast('Please enter food item name(s)', 'error'); return; }
      if (!item.quantity || Number(item.quantity) <= 0) { showToast('Quantity must be greater than 0', 'error'); return; }
      if (!item.category) { showToast('Please select a category for each food item', 'error'); return; }
    }

    if (!form.purpose.trim()) { showToast('Please describe the purpose of this request', 'error'); return; }
    if (!form.deliveryAddress.trim()) { showToast('Delivery address is required', 'error'); return; }

    setSubmitting(true);
    try {
      const payload = {
        ngoEmail: ngo?.ngoEmail,
        foodItemsNeeded: foodItems.map(item => ({
          foodName: item.foodName.trim(),
          quantity: Number(item.quantity),
          quantityType: item.quantityType,
          category: item.category,
        })),
        contactPersonName: form.contactPersonName,
        phoneNumber: form.phoneNumber,
        email: form.email,
        deliveryAddress: form.deliveryAddress,
        city: form.city,
        purpose: form.purpose,
        urgencyLevel: form.urgencyLevel,
        numberOfBeneficiaries: form.numberOfBeneficiaries ? Number(form.numberOfBeneficiaries) : 0,
      };

      await api.post('/aahar/ngo-food-requests/create', payload);
      showToast('Food request submitted! Admin will review it shortly. 🎉', 'success');

      // Reset form
      setFoodItems([{ ...emptyItem }]);
      setForm(prev => ({ ...prev, purpose: '', numberOfBeneficiaries: '' }));
      fetchData();
      setTab('history');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFulfillRequest = async (id) => {
    try {
      await api.put(`/aahar/ngo-food-requests/${id}/fulfill`);
      showToast('Food request marked as Completed ✅', 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to complete request', 'error');
    }
  };

  const filteredRequests = statusFilter === 'all'
    ? requests
    : requests.filter(r => r.status === statusFilter);

  const avatarLetter = (user?.firstName || 'N')[0].toUpperCase();

  const statsCards = [
    { label: 'Total Requests', value: requests.length, icon: '📋', grad: 'var(--grad-primary)' },
    { label: 'Pending', value: requests.filter(r => r.status === 'pending').length, icon: '⏳', grad: 'linear-gradient(135deg,#eab308,#d97706)' },
    { label: 'Approved', value: requests.filter(r => r.status === 'approved').length, icon: '✅', grad: 'var(--grad-green)' },
    { label: 'Completed', value: requests.filter(r => r.status === 'fulfilled').length, icon: '🚚', grad: 'var(--grad-purple)' },
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar__brand">
          <span>🏢</span>
          <span className="gradient-text" style={{ fontWeight: 800 }}>NGO Portal</span>
        </div>

        <div className="dashboard-sidebar__nav-section-title">Navigation</div>
        <nav className="dashboard-sidebar__nav">
          <button
            className={`dashboard-sidebar__nav-item ${tab === 'overview' ? 'dashboard-sidebar__nav-item--active' : ''}`}
            onClick={() => setTab('overview')}
          >
            <span>📊</span> Overview
          </button>
          {ngo?.isApproved && (
            <button
              className={`dashboard-sidebar__nav-item ${tab === 'request' ? 'dashboard-sidebar__nav-item--active' : ''}`}
              onClick={() => setTab('request')}
            >
              <span>🥣</span> Request Food
            </button>
          )}
          {ngo?.isApproved && (
            <button
              className={`dashboard-sidebar__nav-item ${tab === 'donations' ? 'dashboard-sidebar__nav-item--active' : ''}`}
              onClick={() => setTab('donations')}
            >
              <span>🎁</span> Direct Donations
              {assignedDonations.filter(d => {
                const s = (d.status || '').replace(/_/g, '').toUpperCase();
                return s === 'PENDINGNGOACCEPTANCE' || s === 'NGOACCEPTED' || s === 'APPROVED' || s === 'REQUESTACCEPTED';
              }).length > 0 && tab !== 'donations' && (
                <span style={{ marginLeft: 'auto', background: 'rgba(234,179,8,0.15)', color: '#fbbf24', fontSize: '0.72rem', fontWeight: 700, padding: '1px 7px', borderRadius: 99 }}>
                  {assignedDonations.filter(d => {
                    const s = (d.status || '').replace(/_/g, '').toUpperCase();
                    return s === 'PENDINGNGOACCEPTANCE' || s === 'NGOACCEPTED' || s === 'APPROVED' || s === 'REQUESTACCEPTED';
                  }).length}
                </span>
              )}
            </button>
          )}
          <button
            className={`dashboard-sidebar__nav-item ${tab === 'history' ? 'dashboard-sidebar__nav-item--active' : ''}`}
            onClick={() => setTab('history')}
          >
            <span>📜</span> Request History
            {requests.length > 0 && tab !== 'history' && (
              <span style={{ marginLeft: 'auto', background: 'rgba(249,115,22,0.15)', color: 'var(--color-orange)', fontSize: '0.72rem', fontWeight: 700, padding: '1px 7px', borderRadius: 99 }}>
                {requests.length}
              </span>
            )}
          </button>
          <Link to="/dashboard" className="dashboard-sidebar__nav-item">
            <span>📦</span> Donations
          </Link>
          <Link to="/" className="dashboard-sidebar__nav-item">
            <span>🏠</span> Home
          </Link>
        </nav>

        <div className="dashboard-sidebar__nav-section-title" style={{ marginTop: 8 }}>NGO Status</div>
        {loading ? (
          <div style={{ padding: '12px 14px' }}>
            <div className="skeleton" style={{ height: 60, borderRadius: 'var(--radius-md)' }} />
          </div>
        ) : ngo ? (
          <div style={{ padding: '12px 14px', background: ngo.isApproved ? 'rgba(34,197,94,0.06)' : 'rgba(234,179,8,0.06)', borderRadius: 'var(--radius-md)', border: `1px solid ${ngo.isApproved ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)'}`, margin: '0 0 12px' }}>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: 4 }}>{ngo.ngoName}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6 }}>📍 {ngo.ngoCity}</div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
              background: ngo.isApproved ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
              color: ngo.isApproved ? '#4ade80' : '#fbbf24'
            }}>
              {ngo.isApproved ? '✅ Approved' : '⏳ Pending Approval'}
            </div>
          </div>
        ) : (
          <div style={{ padding: '10px 14px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            No NGO registered yet.
            <br />
            <Link to="/ngo-register" style={{ color: 'var(--color-orange)', fontWeight: 600, marginTop: 4, display: 'inline-block' }}>
              → Register your NGO
            </Link>
          </div>
        )}

        <div className="dashboard-sidebar__user">
          <div className="dashboard-sidebar__avatar" style={{ background: 'var(--grad-teal)' }}>{avatarLetter}</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.firstName} {user?.surname}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-teal)' }}>NGO Representative</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{ width: '100%', marginTop: 10, padding: '10px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-md)', color: 'var(--color-red)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
        >
          🚪 Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Mobile Tab Navigation */}
        <div className="dashboard-mobile-nav">
          <button 
            className={`dashboard-mobile-nav-item ${tab === 'overview' ? 'dashboard-mobile-nav-item--active' : ''}`}
            onClick={() => setTab('overview')}
          >
            📊 Overview
          </button>
          <button 
            className={`dashboard-mobile-nav-item ${tab === 'request' ? 'dashboard-mobile-nav-item--active' : ''}`}
            onClick={() => setTab('request')}
          >
            🥣 Request
          </button>
          {ngo?.isApproved && (
            <button 
              className={`dashboard-mobile-nav-item ${tab === 'donations' ? 'dashboard-mobile-nav-item--active' : ''}`}
              onClick={() => setTab('donations')}
            >
              🎁 Donations
            </button>
          )}
          <button 
            className={`dashboard-mobile-nav-item ${tab === 'history' ? 'dashboard-mobile-nav-item--active' : ''}`}
            onClick={() => setTab('history')}
          >
            📜 History
          </button>
          <button 
            className="dashboard-mobile-nav-item"
            onClick={logout}
            style={{ color: 'var(--color-red)', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}
          >
            🚪 Logout
          </button>
        </div>
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <div className="breadcrumb">
              <span>🏢</span><span>/</span>
              <span>{{ overview: 'Overview', request: 'Food Request', donations: 'Direct Donations', history: 'History' }[tab]}</span>
            </div>
            <h1 className="dashboard-header__title">
              {tab === 'overview' && '📊 NGO Overview'}
              {tab === 'request' && '🍱 Request Food'}
              {tab === 'donations' && '🎁 Direct Donations'}
              {tab === 'history' && '📜 Request History'}
            </h1>
            <p className="dashboard-header__subtitle">
              {tab === 'overview' && 'Your NGO status and impact at a glance'}
              {tab === 'request' && 'Submit a food request to the admin for fulfillment'}
              {tab === 'donations' && 'Manage and verify food donations preferred/assigned directly to your NGO'}
              {tab === 'history' && 'Track all your food requests and their status'}
            </p>
          </div>
          {tab === 'overview' && <button className="btn-ghost" onClick={fetchData} style={{ fontSize: '0.85rem' }}>🔄 Refresh</button>}
          {tab === 'donations' && <button className="btn-ghost" onClick={fetchData} style={{ fontSize: '0.85rem' }}>🔄 Refresh</button>}
          {tab === 'history' && <button className="btn-ghost" onClick={fetchData} style={{ fontSize: '0.85rem' }}>🔄 Refresh</button>}
        </div>

        {/* ─── OVERVIEW ─── */}
        {tab === 'overview' && (
          <div style={{ animation: 'fadeInUp 0.3s ease', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* NGO Status Card */}
            {loading ? (
              <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)' }} />
            ) : !ngo ? (
              <div style={{ padding: '28px 32px', background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: 20 }}>
                <span style={{ fontSize: '2.5rem' }}>🏢</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 6 }}>No NGO Registered</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 14 }}>
                    You haven't registered an NGO yet. Register your NGO to start requesting food donations.
                  </div>
                  <Link to="/ngo-register" className="btn-primary" style={{ fontSize: '0.85rem', padding: '10px 20px' }}>
                    ➕ Register NGO
                  </Link>
                </div>
              </div>
            ) : !ngo.isApproved ? (
              <div style={{ padding: '28px 32px', background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: 20 }}>
                <span style={{ fontSize: '2.5rem' }}>⏳</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fbbf24', marginBottom: 6 }}>
                    {ngo.ngoName} — Awaiting Admin Approval
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Your NGO registration is under review. Once an admin approves it, you'll be able to submit food requests. Check back soon!
                  </div>
                  <div style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    📍 {ngo.ngoCity}, {ngo.ngoState} · Registered {new Date(ngo.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px 28px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: '2.5rem' }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#4ade80', marginBottom: 4 }}>{ngo.ngoName}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      📍 {ngo.ngoCity}, {ngo.ngoState} · {ngo.ngoEmail}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{ngo.ngoPurpose}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    className="btn-primary"
                    style={{ background: 'var(--grad-purple)', padding: '10px 22px', fontSize: '0.88rem', whiteSpace: 'nowrap', border: 'none', color: '#fff' }}
                    onClick={() => { setScannerOpen(true); setVerifyTab('scan'); setScannedData(null); setManualToken(''); setVerifyingRequestId(null); }}
                  >
                    📷 Verify Pickup
                  </button>
                  <button
                    className="btn-primary"
                    style={{ background: 'var(--grad-teal)', padding: '10px 22px', fontSize: '0.88rem', whiteSpace: 'nowrap', border: 'none', color: '#fff' }}
                    onClick={() => setTab('request')}
                  >
                    🍱 Request Food Now
                  </button>
                </div>
              </div>
            )}

            {/* Stats */}
            {ngo && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {statsCards.map((s, i) => (
                  <div key={i} className="dash-stat-card" style={{ animationDelay: `${i * 0.08}s`, animation: 'fadeInUp 0.4s ease both', display: 'flex', alignItems: 'center', gap: 14, padding: 18, background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                    <div className="dash-stat-card__icon" style={{ background: s.grad, width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>{s.icon}</div>
                    <div>
                      <div className="dash-stat-card__value" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{s.value}</div>
                      <div className="dash-stat-card__label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Requests */}
            {ngo && requests.length > 0 && (
              <div className="glass-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>📜 Recent Requests</div>
                  <button className="btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => setTab('history')}>View All →</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {requests.slice(0, 3).map((req) => (
                    <div key={req._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {(req.foodItemsNeeded || []).map(f => f.foodName).join(', ').slice(0, 50)}
                          {(req.foodItemsNeeded || []).map(f => f.foodName).join(', ').length > 50 ? '...' : ''}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <RequestStatusBadge status={req.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick guide if NGO is approved and no requests yet */}
            {ngo?.isApproved && requests.length === 0 && (
              <div style={{ padding: '24px 28px', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 'var(--radius-lg)', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '2rem' }}>💡</span>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--color-teal)', fontSize: '0.95rem', marginBottom: 8 }}>How to Request Food</div>
                  <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                    <li>Click <strong style={{ color: 'var(--color-orange)' }}>🍱 Request Food Now</strong> above or in the sidebar</li>
                    <li>Fill in what food items you need with quantities</li>
                    <li>Describe the purpose and how many beneficiaries will be served</li>
                    <li>Submit — admin will review and fulfill the request</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── REQUEST FOOD FORM ─── */}
        {tab === 'request' && (
          <div style={{ animation: 'fadeInUp 0.3s ease' }}>
            {!ngo?.isApproved ? (
              <EmptyIcon
                icon="🔒"
                title="NGO Not Yet Approved"
                text="Your NGO registration must be approved by an admin before you can submit food requests. Please check back later."
                action={<button className="btn-ghost" style={{ marginTop: 16 }} onClick={() => setTab('overview')}>← Back to Overview</button>}
              />
            ) : (
              <form onSubmit={handleSubmitRequest} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

                {/* Food Items Section */}
                <div className="glass-card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                      <h2 style={{ fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        🍱 Food Items Needed
                      </h2>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>List all food items your NGO needs</p>
                    </div>
                    <button
                      type="button"
                      onClick={addItem}
                      className="btn-teal"
                      style={{ fontSize: '0.82rem', padding: '8px 14px', whiteSpace: 'nowrap' }}
                    >
                      ➕ Add Item
                    </button>
                  </div>

                  {/* Column Headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', gap: 10, padding: '0 16px', marginBottom: 8 }}>
                    {['Food Name', 'Quantity', 'Unit', 'Category', ''].map((h, i) => (
                      <div key={i} style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {foodItems.map((item, idx) => (
                      <FoodItemRow key={idx} item={item} idx={idx} onRemove={removeItem} onChange={updateItem} />
                    ))}
                  </div>
                </div>

                {/* Purpose & Urgency */}
                <div className="glass-card" style={{ padding: 24 }}>
                  <h2 style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    🎯 Request Details
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <label className="form-label">Urgency Level</label>
                      <select className="form-input" name="urgencyLevel" value={form.urgencyLevel} onChange={handleFormChange}>
                        {Object.entries(URGENCY_COLORS).map(([val, { label }]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                      {form.urgencyLevel && (
                        <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700, background: URGENCY_COLORS[form.urgencyLevel].bg, color: URGENCY_COLORS[form.urgencyLevel].color }}>
                          Urgency: {URGENCY_COLORS[form.urgencyLevel].label}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="form-label">Number of Beneficiaries (approx.)</label>
                      <input className="form-input" type="number" min="0" name="numberOfBeneficiaries" placeholder="e.g. 150" value={form.numberOfBeneficiaries} onChange={handleFormChange} />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Purpose / Why do you need this food? <span style={{ color: 'var(--color-red)' }}>*</span></label>
                    <textarea
                      className="form-input"
                      name="purpose"
                      rows={4}
                      style={{ resize: 'vertical' }}
                      placeholder="Describe who will benefit and why this food is needed (e.g., weekly community kitchen serving underprivileged families)..."
                      value={form.purpose}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                </div>

                {/* Contact & Delivery */}
                <div className="glass-card" style={{ padding: 24 }}>
                  <h2 style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    📞 Delivery Contact Details
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="form-label">Contact Person Name <span style={{ color: 'var(--color-red)' }}>*</span></label>
                      <input className="form-input" name="contactPersonName" placeholder="Full name" value={form.contactPersonName} onChange={handleFormChange} required />
                    </div>
                    <div>
                      <label className="form-label">Phone Number <span style={{ color: 'var(--color-red)' }}>*</span></label>
                      <input className="form-input" name="phoneNumber" type="tel" placeholder="10-digit mobile" value={form.phoneNumber} onChange={handleFormChange} required />
                    </div>
                    <div>
                      <label className="form-label">Email Address <span style={{ color: 'var(--color-red)' }}>*</span></label>
                      <input className="form-input" name="email" type="email" placeholder="contact@ngo.org" value={form.email} onChange={handleFormChange} required />
                    </div>
                    <div>
                      <label className="form-label">City <span style={{ color: 'var(--color-red)' }}>*</span></label>
                      <input className="form-input" name="city" placeholder="City" value={form.city} onChange={handleFormChange} required />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Delivery Address <span style={{ color: 'var(--color-red)' }}>*</span></label>
                      <textarea
                        className="form-input"
                        name="deliveryAddress"
                        rows={3}
                        style={{ resize: 'vertical' }}
                        placeholder="Full delivery address where food should be delivered..."
                        value={form.deliveryAddress}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-ghost" onClick={() => setTab('overview')} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" style={{ padding: '12px 28px', fontSize: '0.95rem' }} disabled={submitting}>
                    {submitting ? <><span className="spinner" /> Submitting...</> : '🚀 Submit Food Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ─── REQUEST HISTORY ─── */}
        {tab === 'history' && (
          <div style={{ animation: 'fadeInUp 0.3s ease' }}>
            {/* Filter Bar */}
            <div className="filter-bar" style={{ marginBottom: 20 }}>
              {['all', ...REQUEST_STATUSES].map(s => (
                <button
                  key={s}
                  className={`filter-btn ${statusFilter === s ? 'filter-btn--active' : ''}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === 'all' ? 'All' : s === 'fulfilled' ? 'Completed' : s.charAt(0).toUpperCase() + s.slice(1)}
                  {s !== 'all' && (
                    <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.08)', padding: '0 6px', borderRadius: 99, fontSize: '0.7rem' }}>
                      {requests.filter(r => r.status === s).length}
                    </span>
                  )}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {filteredRequests.length} result{filteredRequests.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)', marginBottom: 12 }} />
              ))
            ) : filteredRequests.length === 0 ? (
              <EmptyIcon
                icon="📋"
                title="No food requests yet"
                text="Submit your first food request to get started."
                action={ngo?.isApproved && (
                  <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => setTab('request')}>
                    🍱 Make a Request
                  </button>
                )}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {filteredRequests.map((req, idx) => {
                  const urgency = URGENCY_COLORS[req.urgencyLevel] || URGENCY_COLORS.medium;
                  return (
                    <div key={req._id} style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', animation: 'fadeInUp 0.3s ease both', animationDelay: `${idx * 0.05}s` }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginBottom: 6 }}>
                            #{String(req._id).slice(-8).toUpperCase()}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Submitted {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, background: urgency.bg, color: urgency.color }}>
                            🔥 {urgency.label} Priority
                          </span>
                          <RequestStatusBadge status={req.status} />
                        </div>
                      </div>

                      {/* Food items */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-orange)', marginBottom: 8 }}>
                          🍱 Food Requested ({(req.foodItemsNeeded || []).length} items)
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {(req.foodItemsNeeded || []).map((item, i) => (
                            <span key={i} style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--color-orange)', padding: '3px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600 }}>
                              {item.foodName} · {item.quantity}{item.quantityType}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Purpose */}
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Purpose:</strong> {req.purpose}
                      </div>

                      {/* Meta row */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
                        {req.numberOfBeneficiaries > 0 && (
                          <span>👥 {req.numberOfBeneficiaries} beneficiaries</span>
                        )}
                        <span>📍 {req.contactDetails?.city}</span>
                        {req.approvedAt && (
                          <span style={{ color: '#4ade80' }}>✅ Approved {new Date(req.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        )}
                        {req.fulfilledAt && (
                          <span style={{ color: '#a78bfa' }}>🚚 Completed {new Date(req.fulfilledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        )}
                        {req.adminNotes && (
                          <span style={{ color: 'var(--color-teal)' }}>💬 {req.adminNotes}</span>
                        )}
                      </div>

                       {/* Donor acceptance details */}
                      {req.acceptedBy && (
                        <div style={{
                          marginTop: 14,
                          padding: 14,
                          background: 'rgba(168, 85, 247, 0.05)',
                          border: '1px solid rgba(168, 85, 247, 0.2)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.82rem'
                        }}>
                          <div style={{ fontWeight: 700, color: '#c084fc', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            🤝 Fulfilling Donor Details
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, color: 'var(--text-secondary)' }}>
                            <div>Donor: <strong style={{ color: 'var(--text-primary)' }}>{req.acceptedBy.firstName} {req.acceptedBy.surname}</strong></div>
                            <div>Phone: <strong style={{ color: 'var(--text-primary)' }}>{req.acceptedBy.phone || 'N/A'}</strong></div>
                            <div>Email: <strong style={{ color: 'var(--text-primary)' }}>{req.acceptedBy.email}</strong></div>
                            <div style={{ gridColumn: '1 / -1', marginTop: 4 }}>
                              Expected Delivery: <strong style={{ color: 'var(--text-primary)' }}>{new Date(req.expectedDeliveryDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                            </div>
                          </div>

                          {req.status !== 'fulfilled' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                💡 Ask the donor for their <strong style={{ color: 'var(--color-orange)' }}>6-digit code</strong> or scan their QR to verify delivery.
                              </div>
                              <button 
                                className="btn-primary" 
                                style={{ fontSize: '0.75rem', padding: '6px 12px', background: 'var(--grad-purple)', border: 'none', color: '#fff', flexShrink: 0, marginLeft: 12 }}
                                onClick={() => {
                                  setScannerOpen(true);
                                  setVerifyTab('scan');
                                  setScannedData(null);
                                  setManualToken('');
                                  setVerifyingRequestId(req._id);
                                }}
                              >
                                📷 Scan QR to Verify
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action buttons (only show manual fulfill button if no donor has accepted yet) */}
                      {req.status === 'approved' && !req.acceptedBy && (
                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                          <button
                            className="btn-primary"
                            style={{
                              fontSize: '0.8rem',
                              padding: '8px 18px',
                              background: 'var(--grad-purple)',
                              boxShadow: '0 0 12px rgba(168,85,247,0.2)',
                              border: 'none',
                              color: '#fff'
                            }}
                            onClick={() => handleFulfillRequest(req._id)}
                          >
                            🚚 Mark as Completed
                          </button>
                        </div>
                      )}

                      {/* Rejection reason */}
                      {req.status === 'rejected' && req.rejectedReason && (
                        <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)', fontSize: '0.82rem', color: '#f87171' }}>
                          ⚠️ Rejection reason: {req.rejectedReason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── DIRECT DONATIONS ─── */}
        {tab === 'donations' && (() => {
          // Normalize any status value to a lowercase key for comparison
          const normalizeStatus = (status) => (status || '').toLowerCase().replace(/_/g, '');

          const isDonationStatusMatch = (status, filter) => {
            if (filter === 'all') return true;
            const s = normalizeStatus(status);
            if (filter === 'pending') {
              // Awaiting NGO acceptance
              return s === 'pendingngoaccaptance' || s === 'pendingngoacceptance';
            }
            if (filter === 'accepted') {
              // Accepted, ready for pickup
              return (
                s === 'approved' ||
                s === 'ngoaccepted' ||
                s === 'requestaccepted' ||
                s === 'pickupinprogress' ||
                s === 'verified'
              );
            }
            if (filter === 'done') {
              return s === 'done' || s === 'completed';
            }
            return s === filter.replace(/_/g, '');
          };
          const filteredDonations = assignedDonations.filter(d => isDonationStatusMatch(d.status, donationStatusFilter));
          return (
            <div className="dashboard-section" style={{ animation: 'fadeInUp 0.3s ease' }}>
              <div className="filter-bar">
                {['all', 'pending', 'accepted', 'done'].map(f => (
                  <button
                    key={f}
                    className={`filter-btn ${donationStatusFilter === f ? 'filter-btn--active' : ''}`}
                    onClick={() => setDonationStatusFilter(f)}
                  >
                    {f === 'all' ? 'All' : f === 'pending' ? 'Awaiting Acceptance' : f === 'accepted' ? 'Ready for Pickup' : 'Completed'}
                    {f !== 'all' && (
                      <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.08)', padding: '0 6px', borderRadius: 99, fontSize: '0.7rem' }}>
                        {assignedDonations.filter(d => isDonationStatusMatch(d.status, f)).length}
                      </span>
                    )}
                  </button>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {filteredDonations.length} result(s)
                </span>
              </div>

              {loading ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading assigned donations...
                </div>
              ) : filteredDonations.length === 0 ? (
                <div className="empty-state" style={{ margin: '32px 0' }}>
                  <div className="empty-state__icon">🎁</div>
                  <h3 className="empty-state__title">No donations found</h3>
                  <p className="empty-state__text">There are no food donations matching this status.</p>
                </div>
              ) : (
                <div style={{ padding: '0 24px 24px', display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                  {filteredDonations.map((donation) => {
                    const donor = donation.foodItemDetails?.[0]?.donorId;
                    const donorName = donor ? `${donor.firstName} ${donor.surname || ''}`.trim() : (donation.contactDetails?.contactPersonName || donation.contactPersonName || 'Donor');
                    const donorPhone = donor?.phone || donation.contactDetails?.phoneNumber || 'N/A';
                    const donorEmail = donor?.email || donation.contactDetails?.email || 'N/A';
                    const sNorm = normalizeStatus(donation.status);
                    const isPendingAcceptance = sNorm === 'pendingngoacceptance';
                    const isAccepted = sNorm === 'approved' || sNorm === 'ngoaccepted' || sNorm === 'requestaccepted' || sNorm === 'pickupinprogress' || sNorm === 'verified';
                    const isCompleted = sNorm === 'done' || sNorm === 'completed';
                    const isRejected = sNorm === 'rejected';
                    
                    return (
                      <div key={donation._id} className="donation-card" style={{ borderLeft: `4px solid ${isPendingAcceptance ? 'var(--color-yellow)' : isCompleted ? '#4ade80' : isRejected ? 'var(--color-red)' : 'var(--color-teal)'}` }}>
                        <div className="donation-card__header">
                          <div>
                            <div className="donation-card__id">#{String(donation._id).slice(-10).toUpperCase()}</div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                              Donor: <strong style={{ color: 'var(--text-primary)' }}>{donorName}</strong>
                            </div>
                          </div>
                          {isCompleted ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700, background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
                              ✅ Completed
                            </span>
                          ) : isRejected ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                              ❌ Rejected
                            </span>
                          ) : isPendingAcceptance ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700, background: 'rgba(234,179,8,0.15)', color: '#fbbf24' }}>
                              ⏳ Awaiting Your Acceptance
                            </span>
                          ) : isAccepted ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700, background: 'rgba(6,182,212,0.15)', color: '#22d3ee' }}>
                              🚚 Ready for Pickup
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700, background: 'rgba(234,179,8,0.15)', color: '#fbbf24' }}>
                              ⏳ Awaiting Admin Approval
                            </span>
                          )}
                        </div>

                        <div className="donation-card__items">
                          {(donation.foodItemDetails || []).map((item, i) => (
                            <span key={i} className="donation-card__item-tag" style={{ background: 'rgba(6,182,212,0.1)', color: '#22d3ee' }}>
                              {item.foodName} · {item.quantity}{item.quantityType}
                            </span>
                          ))}
                        </div>

                        <div className="donation-card__meta">
                          <span className="donation-card__meta-item">📍 Address: {donation.contactDetails?.fullAddress}, {donation.contactDetails?.city}</span>
                          <span className="donation-card__meta-item">📅 Submitted: {new Date(donation.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>

                        <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ fontWeight: 700, color: 'var(--color-teal)', marginBottom: 2 }}>📞 Donor Contact Info:</div>
                          <div>Phone: <strong>{donorPhone}</strong></div>
                          <div>Email: <strong>{donorEmail}</strong></div>
                        </div>

                        {/* Verify pickup — NGO asks the donor for the code, no code shown here */}
                        {isAccepted && (
                          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            💡 Ask the donor to show their <strong style={{ color: 'var(--color-teal)' }}>Pickup Pass</strong> (QR or 6-digit code). Scan or enter it below to verify.
                          </div>
                        )}

                        {/* Accept / Reject buttons for pending acceptance */}
                        {isPendingAcceptance && (
                          <div style={{ display: 'flex', gap: 10, marginTop: 14, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                            <button
                              className="btn-primary"
                              style={{ fontSize: '0.8rem', padding: '7px 16px', flex: 1, background: 'var(--grad-teal)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 6, fontWeight: 600 }}
                              onClick={() => handleAcceptDonation(donation._id)}
                            >
                              ✓ Accept Donation
                            </button>
                            <button
                              className="btn-danger"
                              style={{ fontSize: '0.8rem', padding: '7px 16px', flex: 1, background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', borderRadius: 6, fontWeight: 600 }}
                              onClick={() => handleRejectDonation(donation._id)}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        )}

                        {/* Verify pickup button — opens scanner with blank token so NGO must ask donor */}
                        {isAccepted && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                            <button
                              className="btn-primary"
                              style={{ fontSize: '0.8rem', padding: '7px 16px', background: 'var(--grad-teal)', border: 'none', color: '#fff' }}
                              onClick={() => {
                                setScannerOpen(true);
                                setVerifyTab('scan');
                                setScannedData(null);
                                setManualToken('');
                                setVerifyingRequestId(null);
                              }}
                            >
                              📷 Verify Pickup
                            </button>
                          </div>
                        )}

                        {/* Rejection reason */}
                        {isRejected && donation.rejectedReason && (
                          <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)', fontSize: '0.82rem', color: '#f87171' }}>
                            ⚠️ Rejection reason: {donation.rejectedReason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </main>

      {/* Verify Pickup Scanner Modal */}
      {scannerOpen && (
        <div className="modal-overlay" onClick={() => !verifying && setScannerOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450, width: '90%', maxHeight: '90vh', overflowY: 'auto', padding: 20 }}>
            <h3 className="modal__title" style={{ fontSize: '1.25rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              📷 {verifyingRequestId ? 'Verify Request Fulfillment' : 'Verify Food Pickup'}
            </h3>

            {scannedData ? (
              /* Success Screen */
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: '3.5rem', color: '#4ade80', marginBottom: 16 }}>
                  ✅
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>Verification Successful!</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                  {verifyingRequestId ? 'The food request fulfillment' : 'The food donation'} has been successfully verified and marked as **Completed**.
                </p>
                {(scannedData.foodItemDetails || scannedData.foodItemsNeeded) && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 12, textAlign: 'left', fontSize: '0.8rem', marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--color-orange)' }}>📦 Food Items:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(scannedData.foodItemDetails || scannedData.foodItemsNeeded).map((item, i) => (
                        <span key={i} style={{ background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem' }}>
                          {item.foodName} ({item.quantity}{item.quantityType})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <button className="btn-primary" style={{ background: 'var(--grad-purple)', border: 'none' }} onClick={() => setScannerOpen(false)}>
                  Done
                </button>
              </div>
            ) : (
              /* Scanning/Input Screen */
              <>
                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: 16 }}>
                  <button 
                    style={{ 
                      flex: 1, 
                      padding: '10px 0', 
                      background: 'none', 
                      color: verifyTab === 'scan' ? 'var(--color-orange)' : 'var(--text-secondary)',
                      borderBottom: verifyTab === 'scan' ? '2px solid var(--color-orange)' : 'none',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => setVerifyTab('scan')}
                  >
                    📷 Scan QR Code
                  </button>
                  <button 
                    style={{ 
                      flex: 1, 
                      padding: '10px 0', 
                      background: 'none', 
                      color: verifyTab === 'manual' ? 'var(--color-orange)' : 'var(--text-secondary)',
                      borderBottom: verifyTab === 'manual' ? '2px solid var(--color-orange)' : 'none',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => setVerifyTab('manual')}
                  >
                    ⌨️ Enter Code
                  </button>
                </div>

                {verifyingRequestId && manualToken && (
                  <div style={{ 
                    background: 'rgba(249, 115, 22, 0.05)', 
                    border: '1px solid rgba(249, 115, 22, 0.18)', 
                    borderRadius: 8, 
                    padding: '10px 14px', 
                    marginBottom: 16,
                    fontSize: '0.82rem',
                    textAlign: 'center',
                    color: 'var(--text-secondary)'
                  }}>
                    🔑 Expected Request Token: <strong style={{ fontFamily: 'monospace', fontSize: '1.05rem', color: 'var(--color-orange)', letterSpacing: 0.8 }}>{manualToken}</strong>
                  </div>
                )}

                {verifyTab === 'scan' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      Position the donor's QR code within the frame to automatically verify.
                    </p>
                    <QrScannerComponent 
                      onScanSuccess={(decodedText) => {
                        try {
                          const parsed = JSON.parse(decodedText);
                          const id = parsed.donationId || parsed.requestId || parsed.id;
                          const token = parsed.verificationCode || parsed.token;
                          if (id && token) {
                            if (parsed.type === 'request' || !parsed.donationId) {
                              handleVerifyRequestFulfillment(id, token);
                            } else {
                              handleVerifyPickup(id, token);
                            }
                          } else {
                            showToast("Invalid QR structure", "error");
                          }
                        } catch {
                          if (verifyingRequestId) {
                            handleVerifyRequestFulfillment(verifyingRequestId, decodedText);
                          } else {
                            handleVerifyPickup(null, decodedText);
                          }
                        }
                      }}
                      onScanError={() => {
                        // Suppress scanning chatters
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Type the 6-character verification token provided by the donor.
                    </p>
                    <div className="form-group">
                      <label className="form-label">Verification Token</label>
                      <input 
                        className="form-input"
                        placeholder="e.g. A8F92D"
                        value={manualToken}
                        onChange={(e) => setManualToken(e.target.value.toUpperCase())}
                        maxLength={8}
                        style={{ fontSize: '1.2rem', textAlign: 'center', letterSpacing: 2, fontWeight: 700 }}
                      />
                    </div>
                    <button 
                      className="btn-primary" 
                      style={{ width: '100%', justifyContent: 'center', background: 'var(--grad-purple)', marginTop: 8, border: 'none' }}
                      onClick={() => {
                        if (verifyingRequestId) {
                          handleVerifyRequestFulfillment(verifyingRequestId, manualToken);
                        } else {
                          handleVerifyPickup(null, manualToken);
                        }
                      }}
                      disabled={verifying || !manualToken.trim()}
                    >
                      {verifying ? 'Verifying...' : verifyingRequestId ? 'Verify & Complete Fulfillment' : 'Verify & Complete Pickup'}
                    </button>
                  </div>
                )}

                <div className="modal__actions" style={{ marginTop: 20, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                  <button className="btn-ghost" onClick={() => setScannerOpen(false)} disabled={verifying}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
