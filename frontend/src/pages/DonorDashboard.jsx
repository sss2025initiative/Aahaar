import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axios';
import { showToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';

function SkeletonStatCard() {
  return (
    <div style={{ background: 'rgba(17,24,39,0.8)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 20, display: 'flex', gap: 16 }}>
      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 10, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: 28, width: '60%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 12, width: '40%' }} />
      </div>
    </div>
  );
}

function SkeletonDonation() {
  return (
    <div style={{ background: 'rgba(17,24,39,0.7)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="skeleton" style={{ height: 16, width: '30%' }} />
        <div className="skeleton" style={{ height: 22, width: 80, borderRadius: 99 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 26, width: 90, borderRadius: 99 }} />)}
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        <div className="skeleton" style={{ height: 12, width: 100 }} />
        <div className="skeleton" style={{ height: 12, width: 80 }} />
      </div>
    </div>
  );
}

const FILTER_OPTIONS = ['all', 'pending', 'approved', 'rejected', 'done'];

export default function DonorDashboard() {
  const { user, logout, uploadAadhaar } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewPass, setViewPass] = useState(null);
  const [passType, setPassType] = useState('donation'); // 'donation' | 'request'

  // NGO Requests Fulfillments State
  const [activeRequests, setActiveRequests] = useState([]);
  const [fulfillments, setFulfillments] = useState([]);
  const [acceptModal, setAcceptModal] = useState(null);
  const [expectedDate, setExpectedDate] = useState('');
  const [accepting, setAccepting] = useState(false);

  const donorId = user?._id || user?.id;

  const fetchNgoRequestsData = useCallback(async () => {
    try {
      const activeRes = await api.get('/aahar/ngo-food-requests/active');
      setActiveRequests(activeRes.data?.requests || []);
      const fulRes = await api.get('/aahar/ngo-food-requests/my-fulfillments');
      setFulfillments(fulRes.data?.requests || []);
    } catch (err) {
      console.log('Error fetching NGO requests for donor', err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!donorId) return;
    setLoading(true);
    try {
      const res = await api.get(`/aahar/user-stats/getDashboardStats/${donorId}`);
      const data = res.data?.data || res.data;
      setDonations(data?.recentDonations || data?.donations || []);
      await fetchNgoRequestsData();
    } catch {
      showToast('Could not load your donations', 'error');
    } finally {
      setLoading(false);
    }
  }, [donorId, fetchNgoRequestsData]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      await Promise.resolve();
      if (active) {
        fetchData();
      }
    };
    load();
    return () => { active = false; };
  }, [fetchData]);

  // Handle auto-opening the Fulfill Request modal when redirected from Navbar notifications dropdown
  useEffect(() => {
    if (location.state?.fulfillRequestId && activeRequests.length > 0) {
      const targetReq = activeRequests.find(r => r._id === location.state.fulfillRequestId);
      if (targetReq) {
        setTimeout(() => {
          setAcceptModal(targetReq);
        }, 0);
        // Clear location state immediately to prevent popping open on page reload
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, activeRequests]);

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await api.delete(`/aahar/foodInfo/deleteFoodInfo/${id}`);
      showToast('Donation deleted successfully', 'success');
      setDonations((prev) => prev.filter((d) => d._id !== id));
      setDeleteConfirm(null);
    } catch {
      showToast('Could not delete donation', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleAcceptRequest = async (e) => {
    e.preventDefault();
    if (!expectedDate) {
      showToast('Please specify expected delivery date and time', 'error');
      return;
    }
    setAccepting(true);
    try {
      await api.put(`/aahar/ngo-food-requests/${acceptModal._id}/accept`, { expectedDeliveryDate: expectedDate });
      showToast('You have accepted this food request! Verification token generated.', 'success');
      setAcceptModal(null);
      setExpectedDate('');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to accept request', 'error');
    } finally {
      setAccepting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast('Logged out successfully', 'success');
    navigate('/');
  };

  const total = donations.length;
  const pending = donations.filter(d => d.status === 'pending').length;
  const approved = donations.filter(d => d.status === 'approved').length;
  const rejected = donations.filter(d => d.status === 'rejected').length;
  const done = donations.filter(d => d.status === 'done').length;

  const filtered = filter === 'all' ? donations : donations.filter(d => d.status === filter);

  const stats = [
    { label: 'Total Donated', value: total, icon: '📦', grad: 'var(--grad-primary)', sub: 'All time' },
    { label: 'Pending', value: pending, icon: '⏳', grad: 'linear-gradient(135deg,#eab308,#d97706)', sub: 'Awaiting review' },
    { label: 'Approved', value: approved, icon: '✅', grad: 'var(--grad-green)', sub: 'Accepted by NGO' },
    { label: 'Rejected', value: rejected, icon: '❌', grad: 'var(--grad-red)', sub: 'Not accepted' },
    { label: 'Completed', value: done, icon: '🚚', grad: 'var(--grad-purple)', sub: 'Picked up / Done' },
  ];

  const avatarLetter = (user?.firstName || 'U')[0].toUpperCase();
  const timeOfDay = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar__brand">
          <span>🌾</span>
          <span className="gradient-text" style={{ fontWeight: 800 }}>Aahaar</span>
        </div>

        <div className="dashboard-sidebar__nav-section-title">Navigation</div>
        <nav className="dashboard-sidebar__nav">
          <div className="dashboard-sidebar__nav-item dashboard-sidebar__nav-item--active">
            <span>📊</span> Overview
          </div>
          <Link to="/donate" className="dashboard-sidebar__nav-item">
            <span>➕</span> New Donation
          </Link>
          <Link to="/ngo-dashboard" className="dashboard-sidebar__nav-item">
            <span>🏢</span> NGO Portal
          </Link>
          <Link to="/" className="dashboard-sidebar__nav-item">
            <span>🏠</span> Home
          </Link>
        </nav>

        <div className="dashboard-sidebar__nav-section-title" style={{ marginTop: 8 }}>Impact</div>
        <div style={{ padding: '12px 14px', background: 'rgba(249,115,22,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(249,115,22,0.15)', margin: '0 0 12px' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-orange)' }}>{approved}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Donations Approved</div>
          <div style={{ marginTop: 8, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
            <div style={{ height: '100%', width: total > 0 ? `${(approved / total) * 100}%` : '0%', background: 'var(--grad-primary)', borderRadius: 99, transition: 'width 1s ease' }} />
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {total > 0 ? Math.round((approved / total) * 100) : 0}% success rate
          </div>
        </div>

        <div className="dashboard-sidebar__user">
          <div className="dashboard-sidebar__avatar">{avatarLetter}</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.firstName} {user?.surname}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
              📍 {user?.city}
            </div>
            {user?.isVerified ? (
              <div style={{ fontSize: '0.7rem', color: 'var(--color-green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>✓</span> Verified Donor
              </div>
            ) : user?.adharVerificationDocument ? (
              <div style={{ fontSize: '0.7rem', color: 'var(--color-yellow)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>⏳</span> Pending Verify
              </div>
            ) : (
              <div style={{ fontSize: '0.7rem', color: 'var(--color-red)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>✕</span> Unverified Account
              </div>
            )}
          </div>
        </div>
        <button onClick={handleLogout} style={{ width: '100%', marginTop: 10, padding: '10px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-md)', color: 'var(--color-red)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}>
          🚪 Logout
        </button>
      </aside>

      {/* Main */}
      <main className="dashboard-main">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <div className="breadcrumb">
              <span>🏠</span><span>/</span><span>Dashboard</span>
            </div>
            <h1 className="dashboard-header__title">
              {timeOfDay()}, <span className="gradient-text">{user?.firstName}! 👋</span>
            </h1>
            <p className="dashboard-header__subtitle">
              Manage your food donations and track their impact on the community.
            </p>
          </div>
          <Link to="/donate" className="btn-primary" style={{ padding: '12px 24px', whiteSpace: 'nowrap' }}>
            ➕ New Donation
          </Link>
        </div>

        {/* Verification Banner */}
        {!user?.isVerified && (
          <div style={{
            background: 'rgba(17,24,39,0.7)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
            borderColor: user?.adharVerificationDocument ? 'rgba(234,179,8,0.2)' : 'rgba(239,68,68,0.2)'
          }}>
            <div style={{ flex: 1, minWidth: 285 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: '1.25rem' }}>🛡️</span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                  {user?.adharVerificationDocument ? 'Aadhaar Verification Pending' : 'Verify Your Identity'}
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {user?.adharVerificationDocument
                  ? 'Your Aadhaar document has been uploaded successfully and is currently under review by our admin team.'
                  : 'To build trust in our donation community, please upload your Aadhaar card (PDF, JPG, or PNG). Once verified, you will be able to make approved donations.'}
              </p>
            </div>
            {!user?.adharVerificationDocument && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <label className="btn-secondary" style={{ padding: '8px 18px', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  📁 Select Aadhaar
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      if (file.size > 5 * 1024 * 1024) {
                        showToast('File size must be less than 5MB', 'error');
                        return;
                      }

                      const res = await uploadAadhaar(file);
                      if (res.success) {
                        showToast('Aadhaar uploaded successfully! Awaiting verification.', 'success');
                      } else {
                        showToast(res.error || 'Upload failed', 'error');
                      }
                    }}
                  />
                </label>
              </div>
            )}
            {user?.adharVerificationDocument && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-yellow)', fontSize: '0.85rem', fontWeight: 600, background: 'rgba(234,179,8,0.08)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(234,179,8,0.15)' }}>
                  <span>⏳</span> Review in Progress
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stat Cards */}
        <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>
          {loading ? (
            [1, 2, 3, 4, 5].map(i => <SkeletonStatCard key={i} />)
          ) : stats.map((s, i) => (
            <div key={i} className="dash-stat-card" style={{ animationDelay: `${i * 0.08}s`, animation: 'fadeInUp 0.4s ease both' }}>
              <div className="dash-stat-card__icon" style={{ background: s.grad }}>{s.icon}</div>
              <div>
                <div className="dash-stat-card__value" style={{ background: s.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {s.value}
                </div>
                <div className="dash-stat-card__label">{s.label}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Donations Section */}
        <div className="dashboard-section">
          <div className="dashboard-section__header">
            <div>
              <h2 className="dashboard-section__title">My Donations</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {filtered.length} donation{filtered.length !== 1 ? 's' : ''} {filter !== 'all' ? `(${filter})` : 'total'}
              </p>
            </div>
            <Link to="/donate" className="btn-teal" style={{ fontSize: '0.85rem', padding: '8px 18px' }}>
              ➕ Add New
            </Link>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            {FILTER_OPTIONS.map(opt => (
              <button key={opt} className={`filter-btn ${filter === opt ? 'filter-btn--active' : ''}`} onClick={() => setFilter(opt)}>
                {opt === 'all' ? 'All' : opt === 'done' ? 'Completed' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                {opt !== 'all' && (
                  <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.1)', padding: '0px 6px', borderRadius: 99, fontSize: '0.7rem' }}>
                    {donations.filter(d => d.status === opt).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading ? (
              [1, 2, 3].map(i => <SkeletonDonation key={i} />)
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">🍱</div>
                <h3 className="empty-state__title">
                  {filter === 'all' ? 'No donations yet' : `No ${filter} donations`}
                </h3>
                <p className="empty-state__text">
                  {filter === 'all' ? 'Start donating food to make a difference in your community!' : `You have no ${filter} donations right now.`}
                </p>
                {filter === 'all' && (
                  <Link to="/donate" className="btn-primary" style={{ marginTop: 20 }}>
                    🚀 Donate Now
                  </Link>
                )}
              </div>
            ) : (
              filtered.map((donation, idx) => (
                <div key={donation._id} className="donation-card" style={{ animationDelay: `${idx * 0.06}s`, animation: 'fadeInUp 0.4s ease both' }}>
                  <div className="donation-card__header">
                    <div>
                      <div className="donation-card__id">#{String(donation._id).slice(-10).toUpperCase()}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {donation.createdAt ? new Date(donation.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                    </div>
                    <StatusBadge status={(donation.status === 'pending' && donation.adminInReview) ? 'inreview' : donation.status} />
                  </div>

                  <div className="donation-card__items">
                    {(donation.foodItemDetails || []).map((item, i) => (
                      <span key={i} className="donation-card__item-tag">
                        {item.foodName} · {item.quantity}{item.quantityType}
                      </span>
                    ))}
                  </div>

                  <div className="donation-card__meta">
                    {donation.contactDetails?.city && (
                      <span className="donation-card__meta-item">📍 {donation.contactDetails.city}</span>
                    )}
                    {donation.contactDetails?.contactPersonName && (
                      <span className="donation-card__meta-item">👤 {donation.contactDetails.contactPersonName}</span>
                    )}
                    {(donation.foodItemDetails || []).length > 0 && (
                      <span className="donation-card__meta-item">🍽️ {(donation.foodItemDetails || []).length} item{(donation.foodItemDetails || []).length !== 1 ? 's' : ''}</span>
                    )}
                    {donation.status === 'pending' && donation.adminInReview && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--color-teal)' }}>🔍 Under Admin Review</span>
                    )}
                  </div>

                  {donation.status === 'rejected' && donation.rejectedReason && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)', fontSize: '0.82rem', color: '#f87171' }}>
                      ⚠️ Reason: {donation.rejectedReason}
                    </div>
                  )}

                  {(donation.status === 'pending' || donation.status === 'approved') && (
                    <div className="donation-card__actions" style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                      {donation.status === 'pending' && (
                        <button className="btn-danger" style={{ fontSize: '0.8rem', padding: '7px 14px', marginRight: 'auto' }} onClick={() => setDeleteConfirm(donation._id)}>
                          🗑 Delete
                        </button>
                      )}
                      {donation.verificationToken && (
                        <button 
                          className="btn-teal" 
                          style={{ fontSize: '0.8rem', padding: '7px 14px', marginLeft: donation.status === 'pending' ? 0 : 'auto', background: 'var(--grad-teal)', border: 'none', color: '#fff' }}
                          onClick={() => setViewPass(donation)}
                        >
                          🔑 Pickup Pass
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* NGO Fulfillments Section */}
        {!loading && fulfillments.length > 0 && (
          <div className="dashboard-section" style={{ marginTop: 28 }}>
            <div className="dashboard-section__header">
              <div>
                <h2 className="dashboard-section__title">📦 My NGO Fulfillments</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Food requests you accepted to fulfill
                </p>
              </div>
            </div>

            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {fulfillments.map((ful) => (
                <div key={ful._id} className="donation-card" style={{ borderLeft: '4px solid var(--color-purple)' }}>
                  <div className="donation-card__header">
                    <div>
                      <div className="donation-card__id">#{String(ful._id).slice(-10).toUpperCase()}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        NGO: <strong style={{ color: 'var(--text-primary)' }}>{ful.ngoId?.ngoName}</strong>
                      </div>
                    </div>
                    <span style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700,
                      background: ful.status === 'fulfilled' ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.15)',
                      color: ful.status === 'fulfilled' ? '#a78bfa' : '#60a5fa'
                    }}>
                      {ful.status === 'fulfilled' ? '🚚 Completed' : '⏳ Accepted'}
                    </span>
                  </div>

                  <div className="donation-card__items">
                    {(ful.foodItemsNeeded || []).map((item, i) => (
                      <span key={i} className="donation-card__item-tag" style={{ background: 'rgba(168,85,247,0.1)', color: '#c084fc' }}>
                        {item.foodName} · {item.quantity}{item.quantityType}
                      </span>
                    ))}
                  </div>

                  <div className="donation-card__meta">
                    <span className="donation-card__meta-item">📍 Delivery to: {ful.contactDetails?.deliveryAddress}, {ful.contactDetails?.city}</span>
                    <span className="donation-card__meta-item">📅 Expected Delivery: {new Date(ful.expectedDeliveryDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {ful.status !== 'fulfilled' && (
                    <div className="donation-card__actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                      <button 
                        className="btn-teal" 
                        style={{ fontSize: '0.8rem', padding: '7px 14px', background: 'var(--grad-purple)', border: 'none', color: '#fff' }}
                        onClick={() => { setPassType('request'); setViewPass(ful); }}
                      >
                        🔑 Delivery Pass
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open NGO Food Requests Section */}
        {!loading && (
          <div className="dashboard-section" style={{ marginTop: 28 }}>
            <div className="dashboard-section__header">
              <div>
                <h2 className="dashboard-section__title">🏥 Active NGO Food Needs</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Help local NGOs by donating food to fulfill these active requests
                </p>
              </div>
            </div>

            {activeRequests.length === 0 ? (
              <div style={{ padding: '36px 24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', margin: '16px 24px' }}>
                <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: 8 }}>🌾</span>
                No active food requests from NGOs at the moment.
              </div>
            ) : (
              <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeRequests.map((req) => (
                  <div key={req._id} className="donation-card" style={{ borderLeft: '4px solid var(--color-orange)' }}>
                    <div className="donation-card__header">
                      <div>
                        <div className="donation-card__id">{req.ngoId?.ngoName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          📍 {req.ngoId?.ngoCity}, {req.ngoId?.ngoState}
                        </div>
                      </div>
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700,
                        background: req.urgencyLevel === 'critical' ? 'rgba(239,68,68,0.15)' : req.urgencyLevel === 'high' ? 'rgba(249,115,22,0.15)' : 'rgba(234,179,8,0.15)',
                        color: req.urgencyLevel === 'critical' ? '#f87171' : req.urgencyLevel === 'high' ? '#fb923c' : '#fbbf24'
                      }}>
                        ⚡ {req.urgencyLevel?.toUpperCase()} Urgency
                      </span>
                    </div>

                    <div className="donation-card__items">
                      {(req.foodItemsNeeded || []).map((item, i) => (
                        <span key={i} className="donation-card__item-tag" style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--color-orange)' }}>
                          {item.foodName} · {item.quantity}{item.quantityType} ({item.category})
                        </span>
                      ))}
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '8px 0 14px' }}>
                      <strong>Purpose:</strong> {req.purpose}
                    </div>

                    <div className="donation-card__actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn-primary" 
                        style={{ fontSize: '0.8rem', padding: '7px 18px', border: 'none', color: '#fff' }}
                        onClick={() => setAcceptModal(req)}
                      >
                        🤝 Fulfill Request
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick tips */}
        {!loading && donations.length > 0 && (
          <div style={{ marginTop: 24, padding: '20px 24px', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: '1.5rem' }}>💡</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-teal)' }}>Pro Tip</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Add accurate expiry dates and food details to increase the chances of your donation being approved quickly.</div>
            </div>
          </div>
        )}
      </main>

      {/* Delete Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__icon">🗑️</div>
            <h3 className="modal__title">Delete Donation?</h3>
            <p className="modal__text">This action is permanent and cannot be undone. The donation record will be removed from the system.</p>
            <div className="modal__actions">
              <button className="btn-ghost" onClick={() => setDeleteConfirm(null)} disabled={deleting}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm)} disabled={deleting}>
                {deleting ? <><span className="spinner" /> Deleting...</> : '🗑 Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pickup/Delivery Pass Modal */}
      {viewPass && (
        <div className="modal-overlay" onClick={() => setViewPass(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center' }}>
            <h3 className="modal__title" style={{ fontSize: '1.2rem', marginBottom: 12 }}>
              🎫 Food {passType === 'request' ? 'Delivery' : 'Pickup'} Pass
            </h3>
            <p className="modal__text" style={{ fontSize: '0.82rem', marginBottom: 16, color: 'var(--text-secondary)' }}>
              Show this QR code or share the 6-character token with the NGO representative at the time of delivery to verify.
            </p>
            
            {/* QR Code Container */}
            <div style={{ 
              background: '#ffffff', 
              padding: 16, 
              borderRadius: 12, 
              width: 182, 
              height: 182, 
              margin: '0 auto 16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(JSON.stringify({ type: passType, id: viewPass._id, token: viewPass.verificationToken }))}`}
                alt="Donation QR Pass"
                style={{ width: 150, height: 150 }}
              />
            </div>

            {/* Token Code */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                Verification Token
              </div>
              <div style={{ 
                fontFamily: 'monospace', 
                fontSize: '1.6rem', 
                fontWeight: 800, 
                color: 'var(--color-orange)', 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                padding: '8px 16px',
                display: 'inline-block',
                letterSpacing: 3
              }}>
                {viewPass.verificationToken}
              </div>
            </div>

            <div className="modal__actions" style={{ justifyContent: 'center' }}>
              <button className="btn-ghost" onClick={() => setViewPass(null)}>Close Pass</button>
            </div>
          </div>
        </div>
      )}

      {/* Accept Request Modal */}
      {acceptModal && (
        <div className="modal-overlay" onClick={() => !accepting && setAcceptModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <h3 className="modal__title">🤝 Fulfill Food Request</h3>
            <p className="modal__text" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              You are accepting to fulfill the food needs for <strong>{acceptModal.ngoId?.ngoName}</strong>. 
              Please specify when you will deliver or have the food ready for pickup.
            </p>
            
            <form onSubmit={handleAcceptRequest} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Expected Delivery Date & Time *</label>
                <input 
                  type="datetime-local"
                  className="form-input"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  required
                  min={new Date().toISOString().slice(0, 16)}
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>

              <div className="modal__actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                <button type="button" className="btn-ghost" onClick={() => setAcceptModal(null)} disabled={accepting}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ border: 'none', color: '#fff' }} disabled={accepting}>
                  {accepting ? 'Confirming...' : 'Confirm Fulfillment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
