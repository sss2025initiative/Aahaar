import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { showToast } from './Toast';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
            {!isAdmin && (
              <Link to="/ngo-register" className={`navbar__link ${isActive('/ngo-register') ? 'navbar__link--active' : ''}`}>
                NGO Register
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
              {!isAdmin && <Link to="/ngo-register" className="navbar__mobile-link">🏢 NGO Register</Link>}
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
    </>
  );
}
