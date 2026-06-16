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

function ActionBtn({ label, icon, onClick, variant = 'ghost', disabled }) {
  const cls = { ghost: 'btn-ghost', teal: 'btn-teal', danger: 'btn-danger', primary: 'btn-primary' }[variant];
  return (
    <button className={cls} style={{ fontSize: '0.75rem', padding: '5px 12px', whiteSpace: 'nowrap' }} onClick={onClick} disabled={disabled}>
      {icon} {label}
    </button>
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
  const [donationFilter, setDonationFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');

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

      if (tab === 'overview') fetchStats();
      else if (tab === 'users') fetchUsers();
      else if (tab === 'donations') fetchDonations();
      else if (tab === 'ngos') fetchNgos();
    };
    loadData();
    return () => {
      active = false;
    };
  }, [tab, fetchStats, fetchUsers, fetchDonations, fetchNgos]);

  // User actions
  const makeAdmin = async (id) => { try { await api.put(`/aahar/admin/users/${id}/make-admin`); showToast('User promoted to Admin', 'success'); fetchUsers(); } catch { showToast('Failed', 'error'); } };
  const removeAdmin = async (id) => { try { await api.put(`/aahar/admin/users/${id}/remove-admin`); showToast('Admin rights removed', 'success'); fetchUsers(); } catch { showToast('Failed', 'error'); } };
  const deleteUser = async (id) => { if (!window.confirm('Delete this user permanently?')) return; try { await api.delete(`/aahar/admin/users/${id}`); showToast('User deleted', 'success'); fetchUsers(); } catch { showToast('Failed', 'error'); } };
  const verifyUser = async (id) => { try { await api.put(`/aahar/admin/verify-user/${id}`); showToast('User verified ✓', 'success'); fetchUsers(); } catch { showToast('Failed', 'error'); } };


  // Donation actions
  const approveDonation = async (id) => { try { await api.put(`/aahar/admin/food-donations/${id}/approve`); showToast('Donation approved ✅', 'success'); fetchDonations(); } catch { showToast('Failed', 'error'); } };
  const approveInReview = async (id) => { try { await api.put(`/aahar/admin/food-donations/${id}/approve-inreview`); showToast('Marked In Review', 'success'); fetchDonations(); } catch { showToast('Failed', 'error'); } };
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
          <div style={{ animation: 'fadeInUp 0.3s ease' }}>
            <div className="dashboard-stats" style={{ marginBottom: 28 }}>
              {overviewStats.map((s, i) => (
                <div key={i} className="dash-stat-card">
                  <div className="dash-stat-card__icon" style={{ background: s.grad }}>{s.icon}</div>
                  <div>
                    <div className="dash-stat-card__value" style={{ background: s.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {s.value?.toLocaleString() ?? '—'}
                    </div>
                    <div className="dash-stat-card__label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="admin-overview-cards">
              {TABS.filter(t => t.id !== 'overview').map(t => (
                <div key={t.id} className="admin-quick-card" onClick={() => setTab(t.id)}>
                  <span style={{ fontSize: '2rem' }}>{t.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700 }}>Manage {t.label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>Click to view →</div>
                  </div>
                </div>
              ))}
            </div>

            {stats && (
              <div style={{ marginTop: 24, padding: '20px 24px', background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📈</span> Platform Health
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  {[
                    { label: 'Approved Rate', val: stats.totalDonations ? `${Math.round(((stats.approvedDonations || 0) / stats.totalDonations) * 100)}%` : '—', color: 'var(--color-green)' },
                    { label: 'Pending', val: stats.pendingDonations ?? '—', color: 'var(--color-yellow)' },
                    { label: 'Cities Active', val: stats.citiesCount ?? '—', color: 'var(--color-teal)' },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: item.color }}>{item.val}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{item.label}</div>
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
                            <ActionBtn icon="🔍" label="Review" onClick={() => approveInReview(d._id)} />
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
    </div>
  );
}
