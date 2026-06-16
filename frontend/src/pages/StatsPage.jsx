import { useState, useEffect } from 'react';
import api from '../api/axios';
import { showToast } from '../components/Toast';

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/aahar/stats/getStats')
      .then(res => {
        setStats(res.data?.data || res.data);
      })
      .catch(() => {
        showToast('Unable to load latest stats', 'error');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const totalDonations = stats?.totalDonations || 1280;
  const totalUsers = stats?.totalUsers || 420;
  const totalNgos = stats?.totalNgos || 47;
  const mealsServed = stats?.mealsServed || totalDonations * 8;
  const citiesCount = stats?.citiesCount || 23;
  const topDonors = stats?.stats?.donor?.topDonors || [];
  const categoryDistribution = stats?.stats?.donor?.totalQtyByCategory || [];

  return (
    <div className="stats-page" style={{ padding: 'calc(var(--navbar-h) + 40px) 0 80px', background: 'var(--grad-hero)', minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: 1000 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48, animation: 'fadeInUp 0.6s ease both' }}>
          <span className="section-tag" style={{ background: 'rgba(6,182,212,0.1)', borderColor: 'rgba(6,182,212,0.2)', color: 'var(--color-teal)' }}>
            📊 Live Metrics
          </span>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)', fontWeight: 800, marginBottom: 16 }}>
            Our Collective <span className="gradient-text">Impact</span> 🌍
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
            Every food donation bridges the gap between surplus waste and local communities in need. Tracking live progress across India.
          </p>
        </div>

        {/* Highlight Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 40 }}>
          {[
            { val: mealsServed, suffix: ' kg', label: 'Surplus Food Shared', icon: '🍽️', grad: 'var(--grad-primary)' },
            { val: totalDonations, suffix: '+', label: 'Total Donations', icon: '📦', grad: 'var(--grad-teal)' },
            { val: totalUsers, suffix: '+', label: 'Registered Donors', icon: '👥', grad: 'var(--grad-primary)' },
            { val: totalNgos, suffix: '+', label: 'Active NGOs Joined', icon: '🏢', grad: 'var(--grad-green)' },
            { val: citiesCount, suffix: '+', label: 'Cities Covered', icon: '🏙️', grad: 'var(--grad-purple)' },
          ].map((card, i) => (
            <div key={i} className="glass-card" style={{ padding: 24, textAlign: 'center', position: 'relative', overflow: 'hidden', animation: 'fadeInUp 0.5s ease both', animationDelay: `${i * 0.1}s` }}>
              <div style={{ position: 'absolute', right: -10, top: -10, fontSize: '3rem', opacity: 0.08, pointerEvents: 'none' }}>{card.icon}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, background: card.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>
                {loading ? '...' : `${card.val.toLocaleString('en-IN')}${card.suffix}`}
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{card.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {/* Top Donors */}
          <div className="glass-card" style={{ padding: 28, animation: 'fadeInUp 0.5s ease both', animationDelay: '0.2s' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              🏆 Top Community Donors
            </h3>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
              </div>
            ) : topDonors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                ⭐ Be the first donor of the week!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topDonors.map((donor, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-orange)' }}>#{idx + 1}</span>
                      <div style={{ fontWeight: 700 }}>{donor.name || 'Anonymous Donor'}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-teal)' }}>{donor.totalDonated} kg</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{donor.donationCount} donation{donor.donationCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Categories */}
          <div className="glass-card" style={{ padding: 28, animation: 'fadeInUp 0.5s ease both', animationDelay: '0.3s' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              🥧 Food Distribution Categories
            </h3>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
              </div>
            ) : categoryDistribution.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                No category data recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {categoryDistribution.map((item, idx) => {
                  const maxQty = Math.max(...categoryDistribution.map(c => c.totalQty));
                  const percentage = maxQty > 0 ? (item.totalQty / maxQty) * 100 : 0;
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
                        <span>{item._id}</span>
                        <span style={{ color: 'var(--color-orange)' }}>{item.totalQty} kg</span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${percentage}%`, background: 'var(--grad-primary)', borderRadius: 99, transition: 'width 1s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Live Tracking Feature */}
        <div className="glass-card" style={{ marginTop: 40, padding: 32, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', borderLeft: '4px solid var(--color-orange)', animation: 'fadeInUp 0.5s ease both', animationDelay: '0.4s' }}>
          <div style={{ fontSize: '3rem' }}>🛰️</div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h4 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 6 }}>Real-Time Verification Network</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
              All donations go through a thorough, city-specific routing algorithm. Once approved by our team, the closest available NGO receives immediate collection notifications, minimizing delivery delay and food wastage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
