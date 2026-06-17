import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axios';
import { showToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';

const TABS = [
  { id: 'overview', icon: '📊', label: 'Overview' },
  { id: 'donations', icon: '🍱', label: 'Donations' },
  { id: 'users', icon: '👥', label: 'Users' },
  { id: 'ngos', icon: '🏢', label: 'NGOs' },
];

function SkeletonRow({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}><div className="skeleton" style={{ height: 16, width: `${60 + (i % 3) * 15}%`, borderRadius: 4 }} /></td>
      ))}
    </tr>
  );
}

function RejectModal({ onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__icon">⚠️</div>
        <h3 className="modal__title">Reject Donation</h3>
        <p className="modal__text">Please provide a clear reason. The donor will see this message.</p>
        <textarea className="form-input" rows={4} placeholder="Enter rejection reason..." value={reason}
          onChange={e => setReason(e.target.value)}
          style={{ resize: 'vertical', marginBottom: 4, marginTop: 4 }} />
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>
          {reason.length}/200 characters
        </div>
        <div className="modal__actions">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-danger" onClick={() => onConfirm(reason)} disabled={!reason.trim()}>
            Reject Donation
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewDetailsModal({ donation, onApprove, onReject, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 650, width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 className="modal__title" style={{ fontSize: '1.25rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          🔍 Donation Review Details
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header ID */}
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <strong>Donation ID:</strong> {donation._id}
          </div>

          {/* Pickup and Contact Info */}
          <div>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--color-orange)', marginBottom: 8, fontWeight: 700 }}>📞 Pickup & Contact Info</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.85rem' }}>
              <div><span style={{ color: 'var(--text-secondary)' }}>Contact Person:</span> <strong style={{ color: 'var(--text-primary)' }}>{donation.contactPersonName || donation.contactDetails?.contactPersonName || '—'}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Phone Number:</span> <strong style={{ color: 'var(--text-primary)' }}>{donation.phoneNumber || donation.contactDetails?.phoneNumber || '—'}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Email Address:</span> <strong style={{ color: 'var(--text-primary)' }}>{donation.email || donation.contactDetails?.email || '—'}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>City:</span> <strong style={{ color: 'var(--text-primary)' }}>{donation.city || donation.contactDetails?.city || '—'}</strong></div>
              <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-secondary)' }}>Pickup Address:</span> <strong style={{ color: 'var(--text-primary)' }}>{donation.fullAddress || donation.contactDetails?.fullAddress || '—'}</strong></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--text-secondary)' }}>NGO Preference:</span> <strong style={{ color: 'var(--text-primary)' }}>{donation.ngoPreference === 'random' ? 'Directly Donate (Auto-assign)' : (donation.ngoPreference?.ngoName || donation.ngoPreference || 'Auto-assign')}</strong>
              </div>
            </div>
          </div>

          {/* Food Items List */}
          <div>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--color-orange)', marginBottom: 8, fontWeight: 700 }}>🍱 Food Items ({(donation.foodItemDetails || []).length})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(donation.foodItemDetails || []).map((item, idx) => (
                <div key={idx} style={{ padding: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', gap: 14, alignItems: 'center' }}>
                  {item.imageUrl && item.imageUrl.length > 0 && (
                    <img 
                      src={item.imageUrl[0]} 
                      alt={item.foodName} 
                      style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border-color)', flexShrink: 0 }} 
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.foodName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Category: {item.category} · Expiry: {new Date(item.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {item.packaging && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Packaging: {item.packaging}
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--color-orange)', fontSize: '1rem' }}>
                    {item.quantity} {item.quantityType}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal__actions" style={{ marginTop: 24, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
          <button className="btn-ghost" onClick={onClose}>Close</button>
          {donation.status === 'pending' && (
            <>
              <button className="btn-danger" onClick={onReject}>Reject</button>
              <button className="btn-primary" onClick={onApprove} style={{ background: 'var(--grad-green)' }}>Approve</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ label, icon, onClick, variant = 'ghost', disabled }) {
  const cls = { ghost: 'btn-ghost', teal: 'btn-teal', danger: 'btn-danger', primary: 'btn-primary' }[variant];
  return (
    <button className={cls} style={{ fontSize: '0.75rem', padding: '5px 12px', whiteSpace: 'nowrap' }} onClick={onClick} disabled={disabled}>
      {icon} {label}
    </button>
  );
}

function TrendChart({ data, type }) {
  let formatted;
  if (type === 'weekly') {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    formatted = dayNames.map((name, index) => {
      const dbDay = index + 1;
      const found = data?.find(d => d._id === dbDay);
      return {
        label: name,
        quantity: found ? found.quantity : 0,
        count: found ? found.count : 0
      };
    });
  } else if (type === 'monthly') {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    formatted = monthNames.map((name, index) => {
      const dbMonth = index + 1;
      const found = data?.find(d => d._id === dbMonth);
      return {
        label: name,
        quantity: found ? found.quantity : 0,
        count: found ? found.count : 0
      };
    });
  } else {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);
    formatted = years.map(yr => {
      const found = data?.find(d => d._id === yr);
      return {
        label: String(yr),
        quantity: found ? found.quantity : 0,
        count: found ? found.count : 0
      };
    });
  }

  const maxVal = Math.max(...formatted.map(f => f.quantity), 10);

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ height: 200, width: '100%', display: 'flex', alignItems: 'flex-end', gap: 12, paddingBottom: 8, borderBottom: '1px solid var(--border-color)', position: 'relative' }}>
        {[0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: `${ratio * 100}%`,
            borderTop: '1px dashed rgba(255,255,255,0.05)',
            pointerEvents: 'none'
          }} />
        ))}

        {formatted.map((point, index) => {
          const heightPct = (point.quantity / maxVal) * 100;
          return (
            <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
              <div className="chart-tooltip" style={{
                position: 'absolute',
                bottom: `${heightPct + 6}%`,
                background: 'var(--bg-card)',
                border: '1px solid var(--color-orange)',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#fff',
                opacity: 0,
                pointerEvents: 'none',
                transition: 'opacity 0.2s ease',
                whiteSpace: 'nowrap',
                zIndex: 10,
                boxShadow: 'var(--shadow-sm)'
              }}>
                {point.quantity} kg ({point.count} donations)
              </div>
              
              <div style={{
                width: '70%',
                maxWidth: 40,
                height: `${heightPct}%`,
                background: 'var(--grad-primary)',
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.8s ease',
                cursor: 'pointer',
                boxShadow: '0 0 10px rgba(249,115,22,0.1)'
              }} 
              onMouseEnter={e => {
                const tooltip = e.currentTarget.previousSibling;
                if (tooltip) tooltip.style.opacity = '1';
                e.currentTarget.style.filter = 'brightness(1.2)';
              }}
              onMouseLeave={e => {
                const tooltip = e.currentTarget.previousSibling;
                if (tooltip) tooltip.style.opacity = '0';
                e.currentTarget.style.filter = 'none';
              }}
              />
            </div>
          );
        })}
      </div>
      
      <div style={{ display: 'flex', width: '100%', gap: 12, marginTop: 8 }}>
        {formatted.map((point, index) => (
          <div key={index} style={{ flex: 1, textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {point.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [reviewDonation, setReviewDonation] = useState(null);
  const [donationFilter, setDonationFilter] = useState('pending');
  const [userSearch, setUserSearch] = useState('');
  const [trendPeriod, setTrendPeriod] = useState('weekly');

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/aahar/stats/getStats');
      setStats(res.data?.data || res.data);
    } catch {
      console.log("Error fetching stats");
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/aahar/admin/users');
      setUsers(Array.isArray(res.data) ? res.data : res.data?.users || res.data?.data || []);
    } catch { showToast('Failed to load users', 'error'); }
    finally { setLoading(false); }
  }, []);

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/aahar/admin/getFoodInfoByCity');
      setDonations(res.data?.foodInfo || []);
      const statsRes = await api.get('/aahar/stats/getStats');
      setStats(statsRes.data?.data || statsRes.data);
    } catch { showToast('Failed to load donations', 'error'); }
    finally { setLoading(false); }
  }, []);

  const fetchNgos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/aahar/admin/ngos-based-city');
      setNgos(Array.isArray(res.data) ? res.data : res.data?.ngos || res.data?.data || []);
    } catch { showToast('Failed to load NGOs', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      // Yield to the microtask queue to run asynchronously and avoid cascading renders
      await Promise.resolve();
      if (!active) return;

      fetchStats();
      fetchUsers();
      fetchDonations();
      fetchNgos();
    };
    loadData();
    return () => {
      active = false;
    };
  }, [fetchStats, fetchUsers, fetchDonations, fetchNgos]);

  // User actions
  const makeAdmin = async (id) => { try { await api.put(`/aahar/admin/users/${id}/make-admin`); showToast('User promoted to Admin', 'success'); fetchUsers(); } catch { showToast('Failed', 'error'); } };
  const removeAdmin = async (id) => { try { await api.put(`/aahar/admin/users/${id}/remove-admin`); showToast('Admin rights removed', 'success'); fetchUsers(); } catch { showToast('Failed', 'error'); } };
  const deleteUser = async (id) => { if (!window.confirm('Delete this user permanently?')) return; try { await api.delete(`/aahar/admin/users/${id}`); showToast('User deleted', 'success'); fetchUsers(); } catch { showToast('Failed', 'error'); } };
  const verifyUser = async (id) => { try { await api.put(`/aahar/admin/verify-user/${id}`); showToast('User verified ✓', 'success'); fetchUsers(); } catch { showToast('Failed', 'error'); } };


  // Donation actions
  const approveDonation = async (id) => { try { await api.put(`/aahar/admin/food-donations/${id}/approve`); showToast('Donation approved ✅', 'success'); fetchDonations(); } catch { showToast('Failed', 'error'); } };
  const rejectDonation = async (id, reason) => { try { await api.put(`/aahar/admin/food-donations/${id}/reject`, { rejectionReason: reason }); showToast('Donation rejected', 'success'); setRejectModal(null); fetchDonations(); } catch { showToast('Failed', 'error'); } };

  // NGO actions
  const approveNgo = async (id) => { try { await api.put(`/aahar/admin/approve-ngo/${id}`); showToast('NGO approved ✅', 'success'); fetchNgos(); } catch { showToast('Failed', 'error'); } };

  const handleLogout = async () => { await logout(); showToast('Logged out', 'success'); navigate('/'); };

  const filteredDonations = donationFilter === 'all' ? donations : donations.filter(d => d.status === donationFilter);
  const filteredUsers = userSearch ? users.filter(u => `${u.firstName} ${u.surname} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase())) : users;

  const overviewStats = [
    { label: 'Total Donations', value: stats?.totalDonations, icon: '📦', grad: 'var(--grad-primary)' },
    { label: 'Total Users', value: stats?.totalUsers, icon: '👥', grad: 'var(--grad-teal)' },
    { label: 'NGO Partners', value: stats?.totalNgos, icon: '🏢', grad: 'var(--grad-green)' },
    { label: 'Meals Served', value: stats?.mealsServed, icon: '🍱', grad: 'var(--grad-purple)' },
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar__brand">
          <span>⚡</span>
          <span className="gradient-text" style={{ fontWeight: 800 }}>Admin Panel</span>
        </div>

        <div className="dashboard-sidebar__nav-section-title">Management</div>
        <nav className="dashboard-sidebar__nav">
          {TABS.map(t => (
            <button key={t.id} className={`dashboard-sidebar__nav-item ${tab === t.id ? 'dashboard-sidebar__nav-item--active' : ''}`} onClick={() => setTab(t.id)}>
              <span>{t.icon}</span> {t.label}
              {t.id === 'users' && users.length > 0 && tab !== 'users' && (
                <span style={{ marginLeft: 'auto', background: 'rgba(6,182,212,0.15)', color: 'var(--color-teal)', fontSize: '0.72rem', fontWeight: 700, padding: '1px 7px', borderRadius: 99 }}>
                  {users.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="dashboard-sidebar__nav-section-title" style={{ marginTop: 8 }}>Quick Stats</div>
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
          {[['📦', 'Donations', stats?.totalDonations], ['👥', 'Users', stats?.totalUsers], ['🏢', 'NGOs', stats?.totalNgos]].map(([icon, label, val]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{icon} {label}</span>
              <span style={{ fontWeight: 700 }}>{val ?? '—'}</span>
            </div>
          ))}
        </div>

        <div className="dashboard-sidebar__user">
          <div className="dashboard-sidebar__avatar dashboard-sidebar__avatar--admin">
            {(user?.firstName || 'A')[0].toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.firstName}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-teal)' }}>Administrator</div>
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
        <div className="dashboard-header">
          <div>
            <div className="breadcrumb"><span>⚡</span><span>/</span><span>{TABS.find(t => t.id === tab)?.label}</span></div>
            <h1 className="dashboard-header__title">
              {TABS.find(t => t.id === tab)?.icon} {TABS.find(t => t.id === tab)?.label}
            </h1>
            <p className="dashboard-header__subtitle">
              {{
                overview: 'Platform-wide statistics and health indicators',
                donations: 'Review, approve, and manage all food donation submissions',
                users: 'Manage user accounts, roles, and verification status',
                ngos: 'Review and approve NGO registrations in your city',
              }[tab]}
            </p>
          </div>
          {tab === 'overview' && <button className="btn-ghost" onClick={fetchStats} style={{ fontSize: '0.85rem' }}>🔄 Refresh</button>}
        </div>

        {/* ─── OVERVIEW ─── */}
        {tab === 'overview' && (
          <div style={{ animation: 'fadeInUp 0.3s ease', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {overviewStats.map((s, i) => (
                <div key={i} className="dash-stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18, background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                  <div className="dash-stat-card__icon" style={{ background: s.grad, width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>{s.icon}</div>
                  <div>
                    <div className="dash-stat-card__value" style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                      {s.value?.toLocaleString() ?? '0'}
                    </div>
                    <div className="dash-stat-card__label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="admin-overview-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {TABS.filter(t => t.id !== 'overview').map(t => (
                <div key={t.id} className="admin-quick-card" onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'all 0.25s ease' }}>
                  <span style={{ fontSize: '2rem' }}>{t.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Manage {t.label}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Click to view details →</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24 }}>
              {/* Activity Trend */}
              <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    📈 Donation Activity Trend
                  </div>
                  {/* Period Toggle */}
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: 3, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    {['weekly', 'monthly', 'yearly'].map(t => (
                      <button
                        key={t}
                        onClick={() => setTrendPeriod(t)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: trendPeriod === t ? 'var(--grad-primary)' : 'transparent',
                          color: trendPeriod === t ? '#fff' : 'var(--text-secondary)',
                          transition: 'all var(--transition-fast)',
                          cursor: 'pointer'
                        }}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {stats?.stats?.donations ? (
                  <TrendChart
                    data={
                      trendPeriod === 'weekly'
                        ? stats.stats.donations.weekly
                        : trendPeriod === 'monthly'
                          ? stats.stats.donations.monthly
                          : stats.stats.donations.yearly
                    }
                    type={trendPeriod}
                  />
                ) : (
                  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    Loading trend metrics...
                  </div>
                )}
              </div>

              {/* Food-wise Breakdown */}
              <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  🍱 Food-Wise Distribution
                </div>

                {stats?.stats?.donor?.totalQtyByCategory?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', maxHeight: 220, paddingRight: 4 }}>
                    {stats.stats.donor.totalQtyByCategory.map((cat, idx) => {
                      const maxQty = Math.max(...stats.stats.donor.totalQtyByCategory.map(c => c.totalQty || 1), 1);
                      const percentage = (cat.totalQty / maxQty) * 100;
                      return (
                        <div key={idx}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: 5 }}>
                            <span>{cat._id}</span>
                            <span style={{ color: 'var(--color-orange)' }}>{cat.totalQty} kg</span>
                          </div>
                          <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${percentage}%`, background: 'var(--grad-primary)', borderRadius: 99, transition: 'width 1.2s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No food-wise metrics recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* Platform metrics & Health */}
            {stats && (
              <div style={{ padding: '20px 24px', background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.12)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  🛡️ Platform Safety & Health Indicators
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  {[
                    { label: 'Donation Approval Rate', val: stats.totalDonations ? `${Math.round(((stats.approvedDonations || 0) / stats.totalDonations) * 100)}%` : '0%', color: 'var(--color-green)', icon: '🟢' },
                    { label: 'Pending Verification', val: stats.pendingDonations ?? '0', color: 'var(--color-yellow)', icon: '⏳' },
                    { label: 'Active Cities', val: stats.citiesCount ?? '0', color: 'var(--color-teal)', icon: '🏙️' },
                    { label: 'Avg Approval Time', val: stats.stats?.approvalMetrics?.donor?.averageApprovalTimeHours ? `${stats.stats.approvalMetrics.donor.averageApprovalTimeHours.toFixed(1)} hrs` : 'Immediate', color: 'var(--color-purple)', icon: '⚡' },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: 'center', padding: '14px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <span>{item.icon}</span> {item.val}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 4 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── DONATIONS ─── */}
        {tab === 'donations' && (
          <div className="dashboard-section" style={{ animation: 'fadeInUp 0.3s ease' }}>
            <div className="filter-bar">
              {['all', 'pending', 'approved', 'rejected'].map(f => (
                <button key={f} className={`filter-btn ${donationFilter === f ? 'filter-btn--active' : ''}`} onClick={() => setDonationFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f !== 'all' && donations.length > 0 && (
                    <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.08)', padding: '0 6px', borderRadius: 99, fontSize: '0.7rem' }}>
                      {donations.filter(d => d.status === f).length}
                    </span>
                  )}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {filteredDonations.length} result{filteredDonations.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div className="table-container">
                <table className="admin-table">
                  <thead><tr><th>ID</th><th>Food Items</th><th>Contact</th><th>City</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>{[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} cols={6} />)}</tbody>
                </table>
              </div>
            ) : filteredDonations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">🍱</div>
                <h3 className="empty-state__title">No {donationFilter === 'all' ? '' : donationFilter} donations</h3>
                <p className="empty-state__text">Nothing to show here right now.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Donation ID</th>
                      <th>Food Items</th>
                      <th>Contact</th>
                      <th>City</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDonations.map(d => (
                      <tr key={d._id}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 4 }}>
                            #{String(d._id).slice(-8).toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 200 }}>
                            {(d.foodItemDetails || []).slice(0, 2).map((item, i) => (
                              <span key={i} style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--color-orange)', padding: '2px 8px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600 }}>
                                {item.foodName}
                              </span>
                            ))}
                            {(d.foodItemDetails || []).length > 2 && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>+{d.foodItemDetails.length - 2} more</span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{d.contactPersonName || d.contactDetails?.contactPersonName || '—'}</td>
                        <td style={{ fontSize: '0.85rem' }}>{d.city || d.contactDetails?.city || '—'}</td>
                        <td><StatusBadge status={d.adminInReview ? 'inreview' : d.status} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            <ActionBtn icon="🔍" label="Review" onClick={() => {
                              setReviewDonation(d);
                              if (!d.adminInReview) {
                                api.put(`/aahar/admin/food-donations/${d._id}/approve-inreview`).then(() => fetchDonations()).catch(() => {});
                              }
                            }} />
                            <ActionBtn icon="✅" label="Approve" onClick={() => approveDonation(d._id)} variant="teal" />
                            <ActionBtn icon="✕" label="Reject" onClick={() => setRejectModal(d._id)} variant="danger" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── USERS ─── */}
        {tab === 'users' && (
          <div className="dashboard-section" style={{ animation: 'fadeInUp 0.3s ease' }}>
            <div className="filter-bar">
              <div className="search-input-wrap" style={{ flex: 1, maxWidth: 320 }}>
                <input type="text" className="form-input search-input" placeholder="Search by name or email..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{filteredUsers.length} users</span>
            </div>
            {loading ? (
              <div className="table-container">
                <table className="admin-table">
                  <thead><tr><th>User</th><th>Email</th><th>City</th><th>Role</th><th>Verified</th><th>Actions</th></tr></thead>
                  <tbody>{[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} cols={6} />)}</tbody>
                </table>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="empty-state"><div className="empty-state__icon">👥</div><h3 className="empty-state__title">No users found</h3></div>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr><th>User</th><th>Email</th><th>City</th><th>Role</th><th>Verified</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: u.isAdmin ? 'var(--grad-teal)' : 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', color: '#fff', flexShrink: 0 }}>
                              {(u.firstName || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{u.firstName} {u.surname}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Age {u.age || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                        <td style={{ fontSize: '0.82rem' }}>{u.city || '—'}</td>
                        <td>
                          <span className={`badge ${u.isAdmin ? 'badge-inreview' : 'badge-approved'}`}>
                            {u.isAdmin ? '⚡ Admin' : '👤 User'}
                          </span>
                        </td>
                        <td>
                          {u.isVerified ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-green)', fontWeight: 600 }}>✓ Verified</span>
                          ) : u.adharVerificationDocument ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--color-yellow)', fontWeight: 600 }}>⏳ Pending Review</span>
                              <a href={u.adharVerificationDocument} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: 'var(--color-teal)', textDecoration: 'underline' }}>
                                📄 View Aadhaar
                              </a>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Unverified</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {!u.isVerified && <ActionBtn icon="✓" label="Verify" onClick={() => verifyUser(u._id)} variant="teal" />}
                            {!u.isAdmin
                              ? <ActionBtn icon="⬆" label="Make Admin" onClick={() => makeAdmin(u._id)} />
                              : <ActionBtn icon="⬇" label="Remove Admin" onClick={() => removeAdmin(u._id)} />}
                            <ActionBtn icon="🗑" label="" onClick={() => deleteUser(u._id)} variant="danger" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── NGOS ─── */}
        {tab === 'ngos' && (
          <div style={{ animation: 'fadeInUp 0.3s ease' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ background: 'rgba(17,24,39,0.7)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: 24 }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 10 }} />
                      <div style={{ flex: 1 }}>
                        <div className="skeleton" style={{ height: 18, width: '40%', marginBottom: 8 }} />
                        <div className="skeleton" style={{ height: 13, width: '60%' }} />
                      </div>
                      <div className="skeleton" style={{ height: 36, width: 120, borderRadius: 8 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : ngos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">🏢</div>
                <h3 className="empty-state__title">No NGOs to review</h3>
                <p className="empty-state__text">No NGOs pending approval in your city.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {ngos.map((ngo, idx) => (
                  <div key={ngo._id} className="ngo-admin-card" style={{ animationDelay: `${idx * 0.06}s`, animation: 'fadeInUp 0.4s ease both' }}>
                    <div className="ngo-admin-card__info">
                      <div className="ngo-admin-card__avatar">🏢</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 4 }}>{ngo.ngoName}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 2 }}>{ngo.ngoEmail}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          📍 {ngo.ngoCity}, {ngo.ngoState} · {ngo.ngoPurpose}
                        </div>
                        {ngo.ngoWebsite && (
                          <a href={ngo.ngoWebsite} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: 'var(--color-teal)', marginTop: 4, display: 'inline-block' }}>
                            🔗 {ngo.ngoWebsite}
                          </a>
                        )}
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 6 }}>
                          <div><strong>Reg No:</strong> {ngo.ngoDocuments?.certificationOfRegistration || '—'}</div>
                          <div><strong>PAN Card:</strong> {ngo.ngoDocuments?.ownerPanCard || '—'}</div>
                          {ngo.ngoDocuments?.prevousWorkReport && (
                            <div style={{ whiteSpace: 'pre-wrap' }}><strong>Previous Work:</strong> {ngo.ngoDocuments?.prevousWorkReport}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                      <StatusBadge status={ngo.isApproved ? 'approved' : 'pending'} />
                      {!ngo.isApproved && (
                        <button className="btn-primary" style={{ fontSize: '0.85rem', padding: '9px 20px', whiteSpace: 'nowrap' }} onClick={() => approveNgo(ngo._id)}>
                          ✅ Approve NGO
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Reject Modal */}
      {rejectModal && (
        <RejectModal
          onConfirm={(reason) => rejectDonation(rejectModal, reason)}
          onCancel={() => setRejectModal(null)}
        />
      )}

      {/* Review Details Modal */}
      {reviewDonation && (
        <ReviewDetailsModal
          donation={reviewDonation}
          onApprove={() => {
            approveDonation(reviewDonation._id);
            setReviewDonation(null);
          }}
          onReject={() => {
            setRejectModal(reviewDonation._id);
            setReviewDonation(null);
          }}
          onClose={() => setReviewDonation(null)}
        />
      )}
    </div>
  );
}
