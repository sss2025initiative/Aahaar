import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const FILTER_OPTIONS = ['all', 'pending', 'approved', 'rejected'];

export default function DonorDashboard() {
  const { user, logout, uploadAadhaar } = useAuth();
  const navigate = useNavigate();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const donorId = user?._id || user?.id;

  const fetchData = useCallback(async () => {
    if (!donorId) return;
    setLoading(true);
    try {
      const res = await api.get(`/aahar/user-stats/getDashboardStats/${donorId}`);
      const data = res.data?.data || res.data;
      setDonations(data?.recentDonations || data?.donations || []);
    } catch {
      showToast('Could not load your donations', 'error');
    } finally {
      setLoading(false);
    }
  }, [donorId]);

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

  const handleLogout = async () => {
    await logout();
    showToast('Logged out successfully', 'success');
    navigate('/');
  };

  const total = donations.length;
  const pending = donations.filter(d => d.status === 'pending').length;
  const approved = donations.filter(d => d.status === 'approved').length;
  const rejected = donations.filter(d => d.status === 'rejected').length;

  const filtered = filter === 'all' ? donations : donations.filter(d => d.status === filter);

  const stats = [
    { label: 'Total Donated', value: total, icon: '📦', grad: 'var(--grad-primary)', sub: 'All time' },
    { label: 'Pending', value: pending, icon: '⏳', grad: 'linear-gradient(135deg,#eab308,#d97706)', sub: 'Awaiting review' },
    { label: 'Approved', value: approved, icon: '✅', grad: 'var(--grad-green)', sub: 'Accepted by NGO' },
    { label: 'Rejected', value: rejected, icon: '❌', grad: 'var(--grad-red)', sub: 'Not accepted' },
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
          <Link to="/ngo-register" className="dashboard-sidebar__nav-item">
            <span>🏢</span> NGO Info
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
        <div className="dashboard-stats" style={{ marginBottom: 28 }}>
          {loading ? (
            [1, 2, 3, 4].map(i => <SkeletonStatCard key={i} />)
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
                {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
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
                    <StatusBadge status={donation.adminInReview ? 'inreview' : donation.status} />
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
                    {donation.adminInReview && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--color-teal)' }}>🔍 Under Admin Review</span>
                    )}
                  </div>

                  {donation.status === 'rejected' && donation.rejectedReason && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)', fontSize: '0.82rem', color: '#f87171' }}>
                      ⚠️ Reason: {donation.rejectedReason}
                    </div>
                  )}

                  {donation.status === 'pending' && (
                    <div className="donation-card__actions">
                      <button className="btn-danger" style={{ fontSize: '0.8rem', padding: '7px 14px' }} onClick={() => setDeleteConfirm(donation._id)}>
                        🗑 Delete
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

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
    </div>
  );
}
