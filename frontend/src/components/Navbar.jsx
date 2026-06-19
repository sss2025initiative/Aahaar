import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { showToast } from './Toast';
import api from '../api/axios';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Theme state & logic
  const [theme, setTheme] = useState(() => localStorage.getItem('aahaar_theme') || 'dark');

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('aahaar_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // NGO status check
  const [hasNgo, setHasNgo] = useState(false);

  useEffect(() => {
    let active = true;
    const checkNgoStatus = async () => {
      await Promise.resolve();
      if (!active) return;
      if (user && !isAdmin) {
        try {
          const res = await api.get('/aahar/ngo-food-requests/ngo-status');
          if (active) {
            setHasNgo(!!res.data?.ngo);
          }
        } catch {
          if (active) {
            setHasNgo(false);
          }
        }
      } else {
        if (active) {
          setHasNgo(false);
        }
      }
    };
    checkNgoStatus();
    return () => { active = false; };
  }, [user, isAdmin]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [activeRequests, setActiveRequests] = useState([]);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expectedDate, setExpectedDate] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [acceptedRequestPass, setAcceptedRequestPass] = useState(null);

  const closeModal = () => {
    setSelectedRequestDetails(null);
    setShowDatePicker(false);
    setExpectedDate('');
    setAcceptedRequestPass(null);
  };

  const handleAcceptRequestInline = async (e) => {
    e.preventDefault();
    if (!expectedDate) {
      showToast('Please specify expected delivery date and time', 'error');
      return;
    }
    setAccepting(true);
    try {
      const res = await api.put(`/aahar/ngo-food-requests/${selectedRequestDetails._id}/accept`, { expectedDeliveryDate: expectedDate });
      showToast('You have accepted this food request! Verification token generated.', 'success');
      setAcceptedRequestPass(res.data?.request);
      setExpectedDate('');
      fetchActiveRequests();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to accept request', 'error');
    } finally {
      setAccepting(false);
    }
  };

  const fetchActiveRequests = useCallback(async () => {
    try {
      if (isAdmin) {
        const [resReqs, resDonations] = await Promise.all([
          api.get('/aahar/admin/ngo-food-requests'),
          api.get('/aahar/admin/getFoodInfoByCity')
        ]);
        const reqsList = (resReqs.data?.requests || []).filter(r => r.status === 'pending');
        const donationsList = (resDonations.data?.foodInfo || []).filter(d => d.status === 'pending');
        setActiveRequests([
          ...reqsList.map(r => ({ ...r, type: 'ngo-request' })),
          ...donationsList.map(d => ({ ...d, type: 'donation' }))
        ]);
      } else if (hasNgo) {
        const res = await api.get('/aahar/foodInfo/my-assigned-donations');
        const list = res.data?.donations || [];
        setActiveRequests(list.filter(d => d.status === 'approved').map(d => ({ ...d, type: 'donation' })));
      } else {
        const res = await api.get('/aahar/ngo-food-requests/active');
        const list = res.data?.requests || [];
        const donorId = user?._id || user?.id;
        setActiveRequests(list.filter(r => r.requestedBy !== donorId && r.requestedBy?._id !== donorId).map(r => ({ ...r, type: 'ngo-request' })));
      }
    } catch (err) {
      console.log('Error fetching active food requests for notifications', err);
    }
  }, [isAdmin, hasNgo, user]);

  useEffect(() => {
    if (user) {
      fetchActiveRequests();
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveRequests([]);
    }
  }, [user, fetchActiveRequests]);

  useEffect(() => {
    const handleNotification = () => {
      fetchActiveRequests();
    };
    window.addEventListener('notification-received', handleNotification);
    return () => {
      window.removeEventListener('notification-received', handleNotification);
    };
  }, [fetchActiveRequests]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    showToast('Logged out successfully', 'success');
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
        <div className="navbar__inner container">
          {/* Logo */}
          <Link to="/" className="navbar__logo">
            <span className="navbar__logo-icon">🌾</span>
            <span className="navbar__logo-text">
              <span className="gradient-text">Aahaar</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="navbar__links">
            <Link to="/" className={`navbar__link ${isActive('/') ? 'navbar__link--active' : ''}`}>
              Home
            </Link>
            <Link to="/about" className={`navbar__link ${isActive('/about') ? 'navbar__link--active' : ''}`}>
              About
            </Link>
            <Link to="/stats" className={`navbar__link ${isActive('/stats') ? 'navbar__link--active' : ''}`}>
              Stats
            </Link>
            {user && !isAdmin && (
              <Link to="/dashboard" className={`navbar__link ${isActive('/dashboard') ? 'navbar__link--active' : ''}`}>
                Dashboard
              </Link>
            )}
            {user && !isAdmin && (
              <Link to="/donate" className={`navbar__link ${isActive('/donate') ? 'navbar__link--active' : ''}`}>
                Donate Food
              </Link>
            )}
            {!isAdmin && !hasNgo && (
              <Link to="/ngo-register" className={`navbar__link ${isActive('/ngo-register') ? 'navbar__link--active' : ''}`}>
                NGO Register
              </Link>
            )}
            {!isAdmin && hasNgo && (
              <Link to="/ngo-dashboard" className={`navbar__link ${isActive('/ngo-dashboard') ? 'navbar__link--active' : ''}`}>
                NGO Portal
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" className={`navbar__link navbar__link--admin ${isActive('/admin') ? 'navbar__link--active' : ''}`}>
                ⚡ Admin Panel
              </Link>
            )}
          </div>

          {/* Auth area */}
          <div className="navbar__auth">
            {/* Theme Toggler */}
            <button
              onClick={toggleTheme}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: '50%',
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1.15rem',
                color: 'var(--text-primary)',
                transition: 'all 0.25s',
                marginRight: 12
              }}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-orange)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {user && (
              <NotificationBell
                activeRequests={activeRequests}
                onSelectRequest={setSelectedRequestDetails}
                isAdmin={isAdmin}
              />
            )}

            {user ? (
              <div className="navbar__user" ref={dropdownRef}>
                <button
                  className="navbar__user-btn"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <span className="navbar__avatar">
                    {(user.firstName || user.name || 'U')[0].toUpperCase()}
                  </span>
                  <span className="navbar__user-name">
                    {user.firstName || user.name}
                  </span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>▼</span>
                </button>
                {dropdownOpen && (
                  <div className="navbar__dropdown">
                    <div className="navbar__dropdown-header">
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {user.firstName} {user.surname}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {user.email}
                      </div>
                      {isAdmin && (
                        <span className="badge badge-inreview" style={{ marginTop: 4, fontSize: '0.7rem' }}>
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="navbar__dropdown-divider" />
                    {!isAdmin && (
                      <Link to="/dashboard" className="navbar__dropdown-item">
                        📊 My Dashboard
                      </Link>
                    )}
                    {!isAdmin && (
                      <Link to="/donate" className="navbar__dropdown-item">
                        🍱 Donate Food
                      </Link>
                    )}
                    {!isAdmin && hasNgo && (
                      <Link to="/ngo-dashboard" className="navbar__dropdown-item">
                        🏢 NGO Portal
                      </Link>
                    )}
                    {isAdmin && (
                      <Link to="/admin" className="navbar__dropdown-item">
                        ⚡ Admin Panel
                      </Link>
                    )}
                    <div className="navbar__dropdown-divider" />
                    <button className="navbar__dropdown-item navbar__dropdown-item--danger" onClick={handleLogout}>
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="navbar__auth-btns">
                <Link to="/login" className="btn-secondary" style={{ padding: '8px 20px', fontSize: '0.875rem' }}>
                  Login
                </Link>
                <Link to="/register" className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.875rem' }}>
                  Get Started
                </Link>
              </div>
            )}

            {/* Hamburger */}
            <button
              className={`navbar__hamburger ${menuOpen ? 'navbar__hamburger--open' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`navbar__mobile ${menuOpen ? 'navbar__mobile--open' : ''}`}>
        <div className="navbar__mobile-inner">
          <Link to="/" className="navbar__mobile-link">🏠 Home</Link>
          <Link to="/about" className="navbar__mobile-link">📖 About</Link>
          <Link to="/stats" className="navbar__mobile-link">📊 Stats</Link>
          {user ? (
            <>
              {!isAdmin && <Link to="/dashboard" className="navbar__mobile-link">📊 Dashboard</Link>}
              {!isAdmin && <Link to="/donate" className="navbar__mobile-link">🍱 Donate Food</Link>}
              {isAdmin && <Link to="/admin" className="navbar__mobile-link">⚡ Admin Panel</Link>}
              {!isAdmin && !hasNgo && <Link to="/ngo-register" className="navbar__mobile-link">🏢 NGO Register</Link>}
              {!isAdmin && hasNgo && <Link to="/ngo-dashboard" className="navbar__mobile-link">🏢 NGO Portal</Link>}
              <div className="navbar__mobile-divider" />
              <button className="navbar__mobile-link" style={{ color: 'var(--color-red)', background: 'none', border: 'none', textAlign: 'left', width: '100%', cursor: 'pointer' }} onClick={handleLogout}>
                🚪 Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/ngo-register" className="navbar__mobile-link">🏢 NGO Register</Link>
              <div className="navbar__mobile-divider" />
              <Link to="/login" className="navbar__mobile-link">🔑 Login</Link>
              <Link to="/register" className="navbar__mobile-cta btn-primary">Get Started 🚀</Link>
            </>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {menuOpen && (
        <div className="navbar__backdrop" onClick={() => setMenuOpen(false)} />
      )}

      {/* Detailed Food Request Modal */}
      {selectedRequestDetails && (
        <div className="modal-overlay" onClick={closeModal} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500, padding: 28, background: 'rgba(17,24,39,0.95)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
            <h3 className="modal__title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.3rem', fontWeight: 800 }}>
              🏥 Food Request Details
            </h3>
            
            {acceptedRequestPass ? (
              /* Success delivery pass view inline */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: 16 }}>
                <div style={{ fontSize: '3rem', marginBottom: 10 }}>🎫</div>
                <h4 style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: 4, color: 'var(--color-teal)' }}>Fulfillment Confirmed!</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                  Show this QR code or share the 6-character token with the NGO representative at the time of delivery to verify.
                </p>

                {/* QR Code */}
                <div style={{ 
                  background: '#ffffff', 
                  padding: 12, 
                  borderRadius: 10, 
                  width: 154, 
                  height: 154, 
                  margin: '0 auto 16px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(JSON.stringify({ type: 'request', id: acceptedRequestPass._id, token: acceptedRequestPass.verificationToken }))}`}
                    alt="Delivery QR Pass"
                    style={{ width: 130, height: 130 }}
                  />
                </div>

                {/* Token */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>
                    Verification Token
                  </div>
                  <div style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '1.35rem', 
                    fontWeight: 800, 
                    color: 'var(--color-orange)', 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: 6,
                    padding: '6px 12px',
                    display: 'inline-block',
                    letterSpacing: 2
                  }}>
                    {acceptedRequestPass.verificationToken}
                  </div>
                </div>

                <div className="modal__actions" style={{ width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: 14, justifyContent: 'center' }}>
                  <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px 0', border: 'none', color: '#fff' }} onClick={closeModal}>Done</button>
                </div>
              </div>
            ) : showDatePicker ? (
              /* Inline date picker view */
              <form onSubmit={handleAcceptRequestInline} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
                <div className="form-group" style={{ textAlign: 'left' }}>
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

                <div className="modal__actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14, justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="btn-ghost" onClick={() => setShowDatePicker(false)} disabled={accepting}>Back</button>
                  <button type="submit" className="btn-primary" style={{ border: 'none', color: '#fff', padding: '10px 20px' }} disabled={accepting}>
                    {accepting ? 'Confirming...' : 'Confirm Fulfillment'}
                  </button>
                </div>
              </form>
            ) : (
              /* Request Details view */
              <>
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.9rem', textAlign: 'left' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>NGO Name</div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{selectedRequestDetails.ngoId?.ngoName || '—'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                      📍 {selectedRequestDetails.ngoId?.ngoCity}, {selectedRequestDetails.ngoId?.ngoState}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Food Items Needed</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(selectedRequestDetails.foodItemsNeeded || []).map((item, i) => (
                        <span key={i} className="navbar__noti-tag" style={{ background: 'rgba(249,115,22,0.08)', color: 'var(--color-orange)', fontSize: '0.82rem', padding: '4px 10px', border: '1px solid rgba(249,115,22,0.12)' }}>
                          {item.foodName} · {item.quantity}{item.quantityType} ({item.category})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Urgency Level</div>
                      <span style={{ 
                        fontWeight: 700, 
                        color: selectedRequestDetails.urgencyLevel === 'critical' ? '#f87171' : selectedRequestDetails.urgencyLevel === 'high' ? '#fb923c' : '#fbbf24',
                        fontSize: '0.85rem'
                      }}>
                        {selectedRequestDetails.urgencyLevel?.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Beneficiaries</div>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{selectedRequestDetails.numberOfBeneficiaries || 0} people</span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>Purpose</div>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.4, fontSize: '0.85rem' }}>{selectedRequestDetails.purpose}</p>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>Contact & Delivery Details</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <div>👤 {selectedRequestDetails.contactDetails?.contactPersonName}</div>
                      <div>📞 {selectedRequestDetails.contactDetails?.phoneNumber}</div>
                      <div>✉️ {selectedRequestDetails.contactDetails?.email}</div>
                      <div style={{ marginTop: 4 }}>🚚 <strong>Delivery Address:</strong> {selectedRequestDetails.contactDetails?.deliveryAddress}, {selectedRequestDetails.contactDetails?.city}</div>
                    </div>
                  </div>
                </div>

                <div className="modal__actions" style={{ marginTop: 24, borderTop: '1px solid var(--border-color)', paddingTop: 16, justifyContent: 'flex-end', gap: 10 }}>
                  <button className="btn-ghost" onClick={closeModal}>Close</button>
                  
                  {isAdmin ? (
                    <>
                      <button 
                        className="btn-danger" 
                        onClick={async () => {
                          const reason = prompt("Enter rejection reason:");
                          if (reason === null) return;
                          try {
                            await api.put(`/aahar/admin/ngo-food-requests/${selectedRequestDetails._id}/reject`, { rejectionReason: reason });
                            showToast('NGO request rejected', 'success');
                            closeModal();
                            fetchActiveRequests();
                          } catch {
                            showToast('Failed to reject request', 'error');
                          }
                        }}
                      >
                        ✕ Reject
                      </button>
                      <button 
                        className="btn-primary" 
                        style={{ background: 'var(--grad-green)', border: 'none', color: '#fff', padding: '10px 20px' }}
                        onClick={async () => {
                          try {
                            await api.put(`/aahar/admin/ngo-food-requests/${selectedRequestDetails._id}/approve`);
                            showToast('NGO request approved ✅', 'success');
                            closeModal();
                            fetchActiveRequests();
                          } catch {
                            showToast('Failed to approve request', 'error');
                          }
                        }}
                      >
                        ✓ Approve
                      </button>
                    </>
                  ) : (
                    <button 
                      className="btn-primary" 
                      style={{ border: 'none', color: '#fff', padding: '10px 20px' }}
                      onClick={() => setShowDatePicker(true)}
                    >
                      🤝 Fulfill Request
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
