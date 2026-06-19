import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axios';
import { showToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';

const TABS = [
  { id: 'overview', icon: '📊', label: 'Overview' },
  { id: 'donations', icon: '🍱', label: 'Donations' },
  { id: 'direct-donations', icon: '🎁', label: 'Direct Donations' },
  { id: 'users', icon: '👥', label: 'Users' },
  { id: 'ngos', icon: '🏢', label: 'NGOs' },
  { id: 'ngo-requests', icon: '📋', label: 'NGO Requests' },
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

function ReviewDetailsModal({ donation, onApprove, onReject, onMarkAsDone, onClose, onUpdateQuantities }) {
  const [isEditing, setIsEditing] = useState(false);
  const [items, setItems] = useState(donation.foodItemDetails || []);
  const [updating, setUpdating] = useState(false);

  const handleQtyChange = (idx, val) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], quantity: val === '' ? '' : Number(val) };
    setItems(newItems);
  };

  const handleTypeChange = (idx, val) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], quantityType: val };
    setItems(newItems);
  };

  const handleSave = async () => {
    if (items.some(item => item.quantity <= 0 || isNaN(item.quantity))) {
      showToast('Please enter valid quantities greater than 0', 'error');
      return;
    }
    setUpdating(true);
    try {
      const payload = {
        foodItems: items.map(item => ({
          foodItemId: item._id,
          quantity: Number(item.quantity),
          quantityType: item.quantityType
        }))
      };
      await api.put(`/aahar/admin/food-donations/${donation._id}/quantity-updatation`, payload);
      showToast('Quantities updated successfully', 'success');
      setIsEditing(false);
      if (onUpdateQuantities) {
        onUpdateQuantities();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update quantities', 'error');
    } finally {
      setUpdating(false);
    }
  };

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

          {/* Donor details block if available */}
          {(() => {
            const donor = donation.foodItemDetails?.[0]?.donorId;
            if (!donor || typeof donor !== 'object') return null;
            return (
              <div style={{ background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 8, padding: '12px 14px', fontSize: '0.85rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--color-orange)', fontWeight: 700, margin: '0 0 8px' }}>👤 Donor Info</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, color: 'var(--text-secondary)' }}>
                  <div>Name: <strong style={{ color: 'var(--text-primary)' }}>{donor.firstName} {donor.surname}</strong></div>
                  <div>Email: <strong style={{ color: 'var(--text-primary)' }}>{donor.email}</strong></div>
                  {donor.phone && <div>Phone: <strong style={{ color: 'var(--text-primary)' }}>📞 {donor.phone}</strong></div>}
                  <div>Verified: <strong style={{ color: donor.isVerified ? '#4ade80' : '#f87171' }}>{donor.isVerified ? '✅ Yes' : '❌ No'}</strong></div>
                </div>
              </div>
            );
          })()}

          {/* NGO details block if available */}
          {(() => {
            const ngo = typeof donation.ngoPreference === 'object' && donation.ngoPreference?._id ? donation.ngoPreference : null;
            if (!ngo) return null;
            return (
              <div style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 8, padding: '12px 14px', fontSize: '0.85rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--color-teal)', fontWeight: 700, margin: '0 0 8px' }}>🏢 Assigned NGO</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, color: 'var(--text-secondary)' }}>
                  <div>NGO: <strong style={{ color: 'var(--text-primary)' }}>{ngo.ngoName}</strong></div>
                  <div>Email: <strong style={{ color: 'var(--text-primary)' }}>{ngo.ngoEmail}</strong></div>
                  {ngo.ngoPhone && <div>Phone: <strong style={{ color: 'var(--text-primary)' }}>📞 {ngo.ngoPhone}</strong></div>}
                  <div>Location: <strong style={{ color: 'var(--text-primary)' }}>📍 {ngo.ngoCity}</strong></div>
                  <div>Status: <strong style={{ color: ngo.isApproved ? '#4ade80' : '#fbbf24' }}>{ngo.isApproved ? '✅ Approved' : '⏳ Pending'}</strong></div>
                </div>
              </div>
            );
          })()}

          {/* Food Items List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--color-orange)', fontWeight: 700, margin: 0 }}>🍱 Food Items ({(donation.foodItemDetails || []).length})</h4>
              {(donation.status === 'pending' || donation.status === 'approved') && !isEditing && (
                <button
                  className="btn-ghost"
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  onClick={() => setIsEditing(true)}
                >
                  ✏️ Edit Quantities
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map((item, idx) => (
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
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                      <input
                        type="number"
                        className="form-input"
                        style={{ width: 80, padding: '4px 8px', fontSize: '0.9rem', marginBottom: 0 }}
                        value={item.quantity}
                        onChange={e => handleQtyChange(idx, e.target.value)}
                        min="1"
                      />
                      <select
                        className="form-input"
                        style={{ width: 80, padding: '4px 8px', fontSize: '0.9rem', marginBottom: 0 }}
                        value={item.quantityType}
                        onChange={e => handleTypeChange(idx, e.target.value)}
                      >
                        {['kg', 'g', 'ml', 'l', 'pcs'].map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div style={{ fontWeight: 800, color: 'var(--color-orange)', fontSize: '1rem' }}>
                      {item.quantity} {item.quantityType}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {isEditing && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => { setIsEditing(false); setItems(donation.foodItemDetails || []); }}>
                  Cancel
                </button>
                <button className="btn-primary" style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'var(--grad-teal)' }} onClick={handleSave} disabled={updating}>
                  {updating ? 'Saving...' : 'Save Quantities'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="modal__actions" style={{ marginTop: 24, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
          <button className="btn-ghost" onClick={onClose} disabled={isEditing || updating}>Close</button>
          {!isEditing && (
            <>
              {donation.status === 'pending' && (
                <>
                  <button className="btn-danger" onClick={onReject}>Reject</button>
                  <button className="btn-primary" onClick={onApprove} style={{ background: 'var(--grad-green)' }}>Approve</button>
                </>
              )}
              {donation.status === 'approved' && (
                <button className="btn-primary" onClick={onMarkAsDone} style={{ background: 'var(--grad-purple)' }}>
                  Mark as Done
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function VerificationModal({ onConfirm, onCancel }) {
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (scanning) {
      const scanner = new Html5QrcodeScanner("reader", { qrbox: { width: 250, height: 250 }, fps: 5 }, false);
      scanner.render(
        (text) => {
          scanner.clear().catch(e => console.error(e));
          setScanning(false);
          try {
            const data = JSON.parse(text);
            if (data.verificationCode) setCode(data.verificationCode);
            else setCode(text);
          } catch {
            setCode(text);
          }
        },
        () => {}
      );
      return () => { scanner.clear().catch(e => console.error(e)); };
    }
  }, [scanning]);

  return (
    <div className="modal-overlay" onClick={onCancel} style={{ zIndex: 200 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <h3 className="modal__title" style={{ fontSize: '1.25rem', marginBottom: 8 }}>Verify Donation Pickup</h3>
        <p className="modal__text" style={{ marginBottom: 16 }}>Enter the 6-digit verification code from the donor's dashboard, or scan their QR code.</p>
        
        {scanning ? (
          <div style={{ marginBottom: 16 }}>
            <div id="reader" style={{ width: '100%', borderRadius: 8, overflow: 'hidden' }}></div>
            <button className="btn-ghost" onClick={() => setScanning(false)} style={{ marginTop: 12, width: '100%' }}>Cancel Scan</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <button className="btn-ghost" onClick={() => setScanning(true)} style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 8, fontWeight: 600 }}>
              📷 Scan QR Code
            </button>
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0' }}>— OR —</div>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Enter 6-digit code" 
              value={code} 
              onChange={e => setCode(e.target.value.toUpperCase())}
              style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: 4, fontWeight: 700, padding: 12 }}
              maxLength={6}
            />
          </div>
        )}

        <div className="modal__actions" style={{ marginTop: 24, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" style={{ background: 'var(--grad-teal)' }} onClick={() => onConfirm(code)} disabled={!code && !scanning}>
            Verify & Complete
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

function TrendChart({ data, type }) {
  const [prevData, setPrevData] = useState(data);
  const [prevType, setPrevType] = useState(type);
  const [isLoaded, setIsLoaded] = useState(true);
  const [activeIndex, setActiveIndex] = useState(null);

  if (data !== prevData || type !== prevType) {
    setPrevData(data);
    setPrevType(type);
    setIsLoaded(false);
  }

  useEffect(() => {
    if (!isLoaded) {
      const timer = setTimeout(() => {
        setIsLoaded(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

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
  const niceMax = maxVal > 340 ? Math.ceil(maxVal / 40) * 40 : 340;

  return (
    <div style={{ padding: '10px 0' }}>
      <div style={{ display: 'flex', gap: 16, height: 220, position: 'relative' }}>
        {/* Y-Axis Column */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          width: 32,
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          fontWeight: 600,
          paddingBottom: 8,
          paddingTop: 4,
          userSelect: 'none'
        }}>
          {[niceMax, Math.round(niceMax * 0.75), Math.round(niceMax * 0.5), Math.round(niceMax * 0.25), 0].map((tick, i) => (
            <span key={i}>{tick}</span>
          ))}
        </div>

        {/* Chart Area */}
        <div style={{
          flex: 1,
          height: 200,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 12,
          paddingBottom: 8,
          borderBottom: '1px solid var(--border-color)',
          position: 'relative'
        }}>
          {/* Grid Lines */}
          {[0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: `calc(${ratio * 100}% + 8px)`,
              borderTop: '1px dashed var(--border-color)',
              pointerEvents: 'none',
              opacity: 0.6
            }} />
          ))}

          {/* Bars mapping */}
          {formatted.map((point, index) => {
            const heightPct = (point.quantity / niceMax) * 100;
            const isHovered = activeIndex === index;
            return (
              <div
                key={index}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  position: 'relative',
                  cursor: 'pointer',
                  zIndex: 2
                }}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {/* Column Highlight Background */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  bottom: -8,
                  left: -4,
                  right: -4,
                  background: isHovered ? 'var(--chart-col-hover-bg)' : 'transparent',
                  borderRadius: 6,
                  transition: 'background var(--transition-fast)',
                  pointerEvents: 'none',
                  zIndex: 0
                }} />

                {/* Premium Tooltip */}
                <div style={{
                  position: 'absolute',
                  bottom: `calc(${heightPct}% + 14px)`,
                  background: '#ffffff',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  opacity: isHovered ? 1 : 0,
                  visibility: isHovered ? 'visible' : 'hidden',
                  pointerEvents: 'none',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                  transform: isHovered ? 'translateY(0)' : 'translateY(8px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 2,
                  border: '1px solid rgba(0, 0, 0, 0.05)'
                }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{point.label}</span>
                  <span style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 700 }}>Amount : {point.quantity} kg</span>
                </div>

                {/* Vertical Bar */}
                <div style={{
                  width: '65%',
                  maxWidth: 36,
                  height: isLoaded ? `${heightPct}%` : '0%',
                  background: 'linear-gradient(to top, #3b82f6, #10b981)',
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), filter var(--transition-fast), box-shadow var(--transition-fast)',
                  boxShadow: isHovered ? '0 0 16px rgba(59, 130, 246, 0.4)' : 'none',
                  filter: isHovered ? 'brightness(1.1)' : 'none',
                  zIndex: 1
                }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* X-Axis Column */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <div style={{ width: 32 }} /> {/* offset width matching Y-axis column */}
        <div style={{ flex: 1, display: 'flex', gap: 12 }}>
          {formatted.map((point, index) => (
            <div key={index} style={{ flex: 1, textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {point.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DonationByCategoryChart() {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const categories = [
    { label: 'Prepared Meals', value: 42, color: '#10b981' },
    { label: 'Baked Goods', value: 28, color: '#3b82f6' },
    { label: 'Produce', value: 15, color: '#f97316' },
    { label: 'Dairy', value: 10, color: '#ef4444' },
    { label: 'Other', value: 5, color: '#a855f7' }
  ];

  let cumulative = 0;
  const segments = categories.map((cat, idx) => {
    const offset = 100 - cumulative;
    cumulative += cat.value;
    return {
      ...cat,
      offset,
      idx
    };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 24, height: 180 }}>
      {/* SVG Donut */}
      <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
        <svg width="100%" height="100%" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
          {/* Base Ring */}
          <circle cx="20" cy="20" r="15.915" fill="transparent" stroke="var(--border-color)" strokeWidth="4.5" />
          
          {/* Slices */}
          {segments.map((seg) => {
            const isHovered = hoveredIdx === seg.idx;
            return (
              <circle
                key={seg.idx}
                cx="20"
                cy="20"
                r="15.915"
                fill="transparent"
                stroke={seg.color}
                strokeWidth={isHovered ? '6' : '4.5'}
                strokeDasharray={`${seg.value} 100`}
                strokeDashoffset={seg.offset}
                strokeLinecap="round"
                style={{
                  transition: 'stroke-width 0.2s ease, filter 0.2s ease',
                  cursor: 'pointer',
                  filter: isHovered ? 'brightness(1.1) drop-shadow(0 0 4px rgba(255,255,255,0.1))' : 'none'
                }}
                onMouseEnter={() => setHoveredIdx(seg.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center Text */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          {hoveredIdx !== null ? (
            <>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: categories[hoveredIdx].color, lineHeight: 1.1 }}>
                {categories[hoveredIdx].value}%
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                {categories[hoveredIdx].label}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                100%
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>
                Total
              </div>
            </>
          )}
        </div>
      </div>

      {/* Legends */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 0 }}>
        {categories.map((cat, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.82rem',
                fontWeight: isHovered ? 700 : 500,
                color: isHovered ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                transform: isHovered ? 'translateX(4px)' : 'none',
                minWidth: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.label}</span>
              </div>
              <span style={{ fontWeight: 700, color: isHovered ? cat.color : 'var(--text-muted)', marginLeft: 8, flexShrink: 0 }}>{cat.value}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ImpactSummary() {
  const items = [
    {
      title: 'CO2 Emissions Saved',
      percentage: 68,
      subtext: '12.4 tons saved this year',
      color: '#10b981',
      grad: 'linear-gradient(to right, #10b981, #059669)'
    },
    {
      title: 'Meals Provided',
      percentage: 82,
      subtext: '4,120 meals this quarter',
      color: '#3b82f6',
      grad: 'linear-gradient(to right, #3b82f6, #4f46e5)'
    },
    {
      title: 'Cost Savings',
      percentage: 54,
      subtext: '€6,840 saved this year',
      color: '#f97316',
      grad: 'linear-gradient(to right, #f97316, #ea580c)'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center', height: 180 }}>
      {items.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', fontWeight: 700 }}>
            <span style={{ color: 'var(--text-primary)' }}>{item.title}</span>
            <span style={{ color: item.color }}>{item.percentage}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              height: '100%',
              width: `${item.percentage}%`,
              background: item.grad,
              borderRadius: 99,
              transition: 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }} />
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {item.subtext}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(() => location.state?.tab || 'overview');
  const [users, setUsers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [ngoRequests, setNgoRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [ngoRejectModal, setNgoRejectModal] = useState(null);
  const [reviewDonation, setReviewDonation] = useState(null);
  const [verificationModal, setVerificationModal] = useState(null);
  const [donationFilter, setDonationFilter] = useState(() => location.state?.filter || 'pending');
  const [directDonationFilter, setDirectDonationFilter] = useState('all');
  const [ngoRequestFilter, setNgoRequestFilter] = useState(() => location.state?.ngoRequestFilter || 'pending');
  const [ngoFilter, setNgoFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [trendPeriod, setTrendPeriod] = useState('weekly');

  useEffect(() => {
    if (location.state?.tab) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab(location.state.tab);
    }
    if (location.state?.filter) {
      setDonationFilter(location.state.filter);
    }
    if (location.state?.ngoRequestFilter) {
      setNgoRequestFilter(location.state.ngoRequestFilter);
    }
  }, [location.state]);

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

  const fetchNgoRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/aahar/admin/ngo-food-requests');
      setNgoRequests(res.data?.requests || []);
    } catch { showToast('Failed to load NGO requests', 'error'); }
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
      fetchNgoRequests();
    };
    loadData();
    return () => {
      active = false;
    };
  }, [fetchStats, fetchUsers, fetchDonations, fetchNgos, fetchNgoRequests]);

  // Listen for socket notification events to trigger real-time admin dashboard data refresh
  useEffect(() => {
    const handleNotification = (e) => {
      const notification = e.detail;
      if (notification) {
        if (
          notification.type === 'NEW_DONATION_SUBMITTED' ||
          notification.type === 'DONATION_CREATED' ||
          notification.type === 'DONATION_COMPLETED' ||
          notification.type === 'DONATION_APPROVED' ||
          notification.type === 'DONATION_REJECTED'
        ) {
          fetchDonations();
          fetchStats();
        } else if (
          notification.type === 'NEW_FOOD_REQUEST' ||
          notification.type === 'FOOD_REQUEST_ACCEPTED' ||
          notification.type === 'FOOD_REQUEST_FULFILLED' ||
          notification.type === 'FOOD_REQUEST_APPROVED' ||
          notification.type === 'FOOD_REQUEST_REJECTED'
        ) {
          fetchNgoRequests();
          fetchStats();
        }
      }
    };
    window.addEventListener('notification-received', handleNotification);
    return () => {
      window.removeEventListener('notification-received', handleNotification);
    };
  }, [fetchDonations, fetchNgoRequests, fetchStats]);

  // Auto-refresh relevant data when switching tabs
  const handleTabChange = useCallback((newTab) => {
    setTab(newTab);
    if (newTab === 'ngos') fetchNgos();
    if (newTab === 'ngo-requests') fetchNgoRequests();
    if (newTab === 'donations') fetchDonations();
    if (newTab === 'users') fetchUsers();
  }, [fetchNgos, fetchNgoRequests, fetchDonations, fetchUsers]);

  // User actions
  const makeAdmin = async (id) => { try { await api.put(`/aahar/admin/users/${id}/make-admin`); showToast('User promoted to Admin', 'success'); fetchUsers(); } catch { showToast('Failed', 'error'); } };
  const removeAdmin = async (id) => { try { await api.put(`/aahar/admin/users/${id}/remove-admin`); showToast('Admin rights removed', 'success'); fetchUsers(); } catch { showToast('Failed', 'error'); } };
  const deleteUser = async (id) => { if (!window.confirm('Delete this user permanently?')) return; try { await api.delete(`/aahar/admin/users/${id}`); showToast('User deleted', 'success'); fetchUsers(); } catch { showToast('Failed', 'error'); } };
  const verifyUser = async (id) => { try { await api.put(`/aahar/admin/verify-user/${id}`); showToast('User verified ✓', 'success'); fetchUsers(); } catch { showToast('Failed', 'error'); } };


  // Donation actions
  const approveDonation = async (id) => { try { await api.put(`/aahar/admin/food-donations/${id}/approve`); showToast('Donation approved ✅', 'success'); fetchDonations(); } catch { showToast('Failed', 'error'); } };
  const rejectDonation = async (id, reason) => { try { await api.put(`/aahar/admin/food-donations/${id}/reject`, { rejectionReason: reason }); showToast('Donation rejected', 'success'); setRejectModal(null); fetchDonations(); } catch { showToast('Failed', 'error'); } };
  const markAsDone = async (id, code) => { 
    try { 
      const payload = code ? { verificationCode: code } : {};
      await api.put(`/aahar/admin/food-donations/${id}/done`, payload); 
      showToast('Donation marked as Done ✅', 'success'); 
      setVerificationModal(null);
      fetchDonations(); 
    } catch (err) { 
      showToast(err.response?.data?.message || 'Failed to mark donation as done', 'error'); 
    } 
  };

  // NGO actions
  const approveNgo = async (id) => { try { await api.put(`/aahar/admin/approve-ngo/${id}`); showToast('NGO approved ✅ — NGO can now submit food requests', 'success'); fetchNgos(); fetchStats(); } catch { showToast('Failed to approve NGO', 'error'); } };

  // NGO food request actions
  const approveNgoRequest = async (id) => { try { await api.put(`/aahar/admin/ngo-food-requests/${id}/approve`); showToast('NGO request approved ✅', 'success'); fetchNgoRequests(); } catch { showToast('Failed', 'error'); } };
  const rejectNgoRequest = async (id, reason) => { try { await api.put(`/aahar/admin/ngo-food-requests/${id}/reject`, { rejectionReason: reason }); showToast('NGO request rejected', 'success'); setNgoRejectModal(null); fetchNgoRequests(); } catch { showToast('Failed', 'error'); } };
  const fulfillNgoRequest = async (id) => { try { await api.put(`/aahar/admin/ngo-food-requests/${id}/fulfill`); showToast('NGO request marked as Fulfilled 🚚', 'success'); fetchNgoRequests(); } catch { showToast('Failed to fulfill', 'error'); } };

  const handleLogout = async () => { await logout(); showToast('Logged out', 'success'); navigate('/'); };

  const filteredDonations = donationFilter === 'all' ? donations : donations.filter(d => {
    if (donationFilter === 'pending') {
      return d.status === 'pending' || d.status === 'PENDING_NGO_ACCEPTANCE';
    }
    if (donationFilter === 'approved') {
      return d.status === 'approved' || d.status === 'NGO_ACCEPTED' || d.status === 'REQUEST_ACCEPTED';
    }
    if (donationFilter === 'done') {
      return d.status === 'done' || d.status === 'COMPLETED';
    }
    return d.status === donationFilter;
  });
  const directDonations = donations.filter(d => {
    const ngo = d.ngoPreference;
    // Include if ngoPreference is a populated object OR a valid 24-char ObjectId string
    if (!ngo || ngo === 'random') return false;
    if (typeof ngo === 'object' && (ngo._id || ngo.ngoName)) return true;
    if (typeof ngo === 'string' && /^[a-f\d]{24}$/i.test(ngo)) return true;
    return false;
  });
  const filteredUsers = userSearch ? users.filter(u => `${u.firstName} ${u.surname} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase())) : users;
  const filteredNgoRequests = ngoRequestFilter === 'all' ? ngoRequests : ngoRequests.filter(r => r.status === ngoRequestFilter);

  const URGENCY_MAP = {
    low: { bg: 'rgba(6,182,212,0.12)', color: 'var(--color-teal)', label: 'Low' },
    medium: { bg: 'rgba(234,179,8,0.12)', color: 'var(--color-yellow)', label: 'Medium' },
    high: { bg: 'rgba(249,115,22,0.12)', color: 'var(--color-orange)', label: 'High' },
    critical: { bg: 'rgba(239,68,68,0.12)', color: 'var(--color-red)', label: 'Critical' },
  };

  const NGO_REQ_STATUS_MAP = {
    pending: { bg: 'rgba(234,179,8,0.15)', color: '#fbbf24', icon: '⏳', label: 'Pending' },
    approved: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', icon: '✅', label: 'Approved' },
    rejected: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', icon: '❌', label: 'Rejected' },
    fulfilled: { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa', icon: '🚚', label: 'Fulfilled' },
  };

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
            <button key={t.id} className={`dashboard-sidebar__nav-item ${tab === t.id ? 'dashboard-sidebar__nav-item--active' : ''}`} onClick={() => handleTabChange(t.id)}>
              <span>{t.icon}</span> {t.label}
              {t.id === 'users' && users.length > 0 && tab !== 'users' && (
                <span style={{ marginLeft: 'auto', background: 'rgba(6,182,212,0.15)', color: 'var(--color-teal)', fontSize: '0.72rem', fontWeight: 700, padding: '1px 7px', borderRadius: 99 }}>
                  {users.length}
                </span>
              )}
              {t.id === 'direct-donations' && directDonations.filter(d => {
                const s = (d.status || '').replace(/_/g, '').toUpperCase();
                return s === 'PENDINGNGOACCEPTANCE' || s === 'NGOACCEPTED' || s === 'APPROVED';
              }).length > 0 && tab !== 'direct-donations' && (
                <span style={{ marginLeft: 'auto', background: 'rgba(6,182,212,0.15)', color: 'var(--color-teal)', fontSize: '0.72rem', fontWeight: 700, padding: '1px 7px', borderRadius: 99 }}>
                  {directDonations.filter(d => {
                    const s = (d.status || '').replace(/_/g, '').toUpperCase();
                    return s === 'PENDINGNGOACCEPTANCE' || s === 'NGOACCEPTED' || s === 'APPROVED';
                  }).length}
                </span>
              )}
              {t.id === 'ngos' && ngos.filter(n => !n.isApproved).length > 0 && tab !== 'ngos' && (
                <span style={{ marginLeft: 'auto', background: 'rgba(234,179,8,0.15)', color: 'var(--color-yellow)', fontSize: '0.72rem', fontWeight: 700, padding: '1px 7px', borderRadius: 99 }}>
                  {ngos.filter(n => !n.isApproved).length} pending
                </span>
              )}
              {t.id === 'ngo-requests' && ngoRequests.filter(r => r.status === 'pending').length > 0 && tab !== 'ngo-requests' && (
                <span style={{ marginLeft: 'auto', background: 'rgba(249,115,22,0.15)', color: 'var(--color-orange)', fontSize: '0.72rem', fontWeight: 700, padding: '1px 7px', borderRadius: 99 }}>
                  {ngoRequests.filter(r => r.status === 'pending').length}
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

      <main className="dashboard-main">
        {/* Mobile Tab Navigation */}
        <div className="dashboard-mobile-nav">
          {TABS.map(t => (
            <button 
              key={t.id} 
              className={`dashboard-mobile-nav-item ${tab === t.id ? 'dashboard-mobile-nav-item--active' : ''}`}
              onClick={() => handleTabChange(t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
          <button 
            className="dashboard-mobile-nav-item"
            onClick={handleLogout}
            style={{ color: 'var(--color-red)', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}
          >
            🚪 Logout
          </button>
        </div>
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
                'direct-donations': 'All donations assigned directly to NGOs — full donor, NGO and status details',
                users: 'Manage user accounts, roles, and verification status',
                ngos: 'Review and approve NGO registrations in your city',
                'ngo-requests': 'Review and fulfill food requests from approved NGOs',
              }[tab]}
            </p>
          </div>
          {tab === 'overview' && <button className="btn-ghost" onClick={fetchStats} style={{ fontSize: '0.85rem' }}>🔄 Refresh</button>}
          {tab === 'ngos' && <button className="btn-ghost" onClick={fetchNgos} style={{ fontSize: '0.85rem' }}>🔄 Refresh</button>}
          {tab === 'ngo-requests' && <button className="btn-ghost" onClick={fetchNgoRequests} style={{ fontSize: '0.85rem' }}>🔄 Refresh</button>}
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
                <div key={t.id} className="admin-quick-card" onClick={() => handleTabChange(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'all 0.25s ease' }}>
                  <span style={{ fontSize: '2rem' }}>{t.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Manage {t.label}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Click to view details →</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Activity Trend */}
              <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    📈 Monthly Donations (kg)
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

              {/* Bottom Analytics Row (Donation by Category & Impact Summary) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Donation by Category */}
                <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    📊 Donation by Category
                  </div>
                  <DonationByCategoryChart />
                </div>

                {/* Impact Summary */}
                <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    ✨ Impact Summary
                  </div>
                  <ImpactSummary />
                </div>
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
              {['all', 'pending', 'approved', 'rejected', 'done'].map(f => (
                <button key={f} className={`filter-btn ${donationFilter === f ? 'filter-btn--active' : ''}`} onClick={() => setDonationFilter(f)}>
                  {f === 'done' ? 'Completed' : f.charAt(0).toUpperCase() + f.slice(1)}
                  {f !== 'all' && donations.length > 0 && (
                    <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.08)', padding: '0 6px', borderRadius: 99, fontSize: '0.7rem' }}>
                      {donations.filter(d => {
                        if (f === 'pending') return d.status === 'pending' || d.status === 'PENDING_NGO_ACCEPTANCE';
                        if (f === 'approved') return d.status === 'approved' || d.status === 'NGO_ACCEPTED' || d.status === 'REQUEST_ACCEPTED';
                        if (f === 'done') return d.status === 'done' || d.status === 'COMPLETED';
                        return d.status === f;
                      }).length}
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
                  <thead><tr><th>ID</th><th>Food Items</th><th>Donor</th><th>NGO</th><th>City</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>{[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} cols={7} />)}</tbody>
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
                      <th>Donor</th>
                      <th>NGO Assigned</th>
                      <th>City</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDonations.map(d => {
                      const donor = d.foodItemDetails?.[0]?.donorId;
                      const ngo = typeof d.ngoPreference === 'object' && d.ngoPreference?._id ? d.ngoPreference : null;
                      return (
                        <tr key={d._id}>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 4 }}>
                              #{String(d._id).slice(-8).toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 160 }}>
                              {(d.foodItemDetails || []).slice(0, 2).map((item, i) => (
                                <span key={i} style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--color-orange)', padding: '2px 8px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600 }}>
                                  {item.foodName} {item.quantity}{item.quantityType}
                                </span>
                              ))}
                              {(d.foodItemDetails || []).length > 2 && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>+{d.foodItemDetails.length - 2} more</span>
                              )}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.82rem' }}>
                            {donor ? (
                              <div>
                                <div style={{ fontWeight: 600 }}>{donor.firstName} {donor.surname}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{donor.email}</div>
                                {donor.phone && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>📞 {donor.phone}</div>}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{d.contactDetails?.contactPersonName || '—'}</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.82rem' }}>
                            {ngo ? (
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--color-teal)' }}>{ngo.ngoName}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>📍 {ngo.ngoCity}</div>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>General / Auto-assign</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>{d.contactDetails?.city || '—'}</td>
                          <td><StatusBadge status={(d.status === 'pending' && d.adminInReview) ? 'inreview' : d.status} /></td>
                          <td>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              <ActionBtn icon="🔍" label="Review" onClick={() => {
                                setReviewDonation(d);
                                if (!d.adminInReview && d.status === 'pending') {
                                  api.put(`/aahar/admin/food-donations/${d._id}/approve-inreview`).then(() => fetchDonations()).catch(() => {});
                                }
                              }} />
                              {d.status === 'pending' && (
                                <>
                                  <ActionBtn icon="✅" label="Approve" onClick={() => approveDonation(d._id)} variant="teal" />
                                  <ActionBtn icon="✕" label="Reject" onClick={() => setRejectModal(d._id)} variant="danger" />
                                </>
                              )}
                              {(d.status === 'approved' || d.status === 'NGO_ACCEPTED') && (
                                <ActionBtn icon="📦" label="Mark Done" onClick={() => setVerificationModal(d._id)} variant="teal" />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── DIRECT DONATIONS ─── */}
        {tab === 'direct-donations' && (() => {
          const normS = (s) => (s || '').replace(/_/g, '').toUpperCase();
          const ddFilters = ['all', 'pending', 'accepted', 'completed', 'rejected'];
          const filteredDD = directDonations.filter(d => {
            if (directDonationFilter === 'all') return true;
            const s = normS(d.status);
            if (directDonationFilter === 'pending') return s === 'PENDINGNGOACCEPTANCE';
            if (directDonationFilter === 'accepted') return s === 'NGOACCEPTED' || s === 'APPROVED' || s === 'REQUESTACCEPTED';
            if (directDonationFilter === 'completed') return s === 'DONE' || s === 'COMPLETED';
            if (directDonationFilter === 'rejected') return s === 'REJECTED';
            return true;
          });
          const DD_STATUS = {
            PENDINGNGOACCEPTANCE: { label: '⏳ Awaiting NGO Acceptance', bg: 'rgba(234,179,8,0.15)', color: '#fbbf24' },
            NGOACCEPTED: { label: '🚚 Ready for Pickup', bg: 'rgba(6,182,212,0.15)', color: '#22d3ee' },
            APPROVED: { label: '🚚 Ready for Pickup', bg: 'rgba(6,182,212,0.15)', color: '#22d3ee' },
            REQUESTACCEPTED: { label: '🚚 Ready for Pickup', bg: 'rgba(6,182,212,0.15)', color: '#22d3ee' },
            DONE: { label: '✅ Completed', bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
            COMPLETED: { label: '✅ Completed', bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
            REJECTED: { label: '❌ Rejected', bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
          };
          return (
            <div style={{ animation: 'fadeInUp 0.3s ease' }}>
              <div className="filter-bar" style={{ marginBottom: 20 }}>
                {ddFilters.map(f => (
                  <button key={f} className={`filter-btn ${directDonationFilter === f ? 'filter-btn--active' : ''}`} onClick={() => setDirectDonationFilter(f)}>
                    {f === 'all' ? 'All' : f === 'pending' ? 'Awaiting Acceptance' : f.charAt(0).toUpperCase() + f.slice(1)}
                    {f !== 'all' && (
                      <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.08)', padding: '0 6px', borderRadius: 99, fontSize: '0.7rem' }}>
                        {directDonations.filter(d => {
                          const s = normS(d.status);
                          if (f === 'pending') return s === 'PENDINGNGOACCEPTANCE';
                          if (f === 'accepted') return s === 'NGOACCEPTED' || s === 'APPROVED' || s === 'REQUESTACCEPTED';
                          if (f === 'completed') return s === 'DONE' || s === 'COMPLETED';
                          if (f === 'rejected') return s === 'REJECTED';
                          return true;
                        }).length}
                      </span>
                    )}
                  </button>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{filteredDD.length} result(s)</span>
              </div>

              {filteredDD.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">🎁</div>
                  <h3 className="empty-state__title">No direct donations</h3>
                  <p className="empty-state__text">No donations assigned directly to NGOs found.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {filteredDD.map((d, idx) => {
                    const donor = d.foodItemDetails?.[0]?.donorId;
                    const ngo = typeof d.ngoPreference === 'object' && d.ngoPreference?._id ? d.ngoPreference : null;
                    const sNorm = normS(d.status);
                    const statusInfo = DD_STATUS[sNorm] || { label: d.status, bg: 'rgba(234,179,8,0.15)', color: '#fbbf24' };
                    return (
                      <div key={d._id} style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', borderLeft: `4px solid ${statusInfo.color}`, animation: 'fadeInUp 0.3s ease both', animationDelay: `${idx * 0.05}s` }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                          <div>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginBottom: 6 }}>
                              #{String(d._id).slice(-10).toUpperCase()}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              📅 {new Date(d.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700, background: statusInfo.bg, color: statusInfo.color }}>
                            {statusInfo.label}
                          </span>
                        </div>

                        {/* Food Items */}
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-orange)', marginBottom: 8 }}>
                            🍱 Food Items ({(d.foodItemDetails || []).length})
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {(d.foodItemDetails || []).map((item, i) => (
                              <span key={i} style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--color-orange)', padding: '3px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600 }}>
                                {item.foodName} · {item.quantity}{item.quantityType} ({item.category})
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Donor and NGO info in a 2-col grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                          {/* Donor Info */}
                          <div style={{ background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 8, padding: '12px 14px', fontSize: '0.82rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--color-orange)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                              👤 Donor Details
                            </div>
                            {donor ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, color: 'var(--text-secondary)' }}>
                                <div>Name: <strong style={{ color: 'var(--text-primary)' }}>{donor.firstName} {donor.surname}</strong></div>
                                <div>Email: <strong style={{ color: 'var(--text-primary)' }}>{donor.email}</strong></div>
                                {donor.phone && <div>Phone: <strong style={{ color: 'var(--text-primary)' }}>📞 {donor.phone}</strong></div>}
                                {donor.city && <div>City: <strong style={{ color: 'var(--text-primary)' }}>📍 {donor.city}</strong></div>}
                                <div>Verified: <strong style={{ color: donor.isVerified ? '#4ade80' : '#f87171' }}>{donor.isVerified ? '✓ Yes' : '✕ No'}</strong></div>
                              </div>
                            ) : (
                              <div style={{ color: 'var(--text-secondary)' }}>
                                <div>Contact: <strong style={{ color: 'var(--text-primary)' }}>{d.contactDetails?.contactPersonName || '—'}</strong></div>
                                <div>Phone: <strong style={{ color: 'var(--text-primary)' }}>{d.contactDetails?.phoneNumber || '—'}</strong></div>
                                <div>Email: <strong style={{ color: 'var(--text-primary)' }}>{d.contactDetails?.email || '—'}</strong></div>
                              </div>
                            )}
                          </div>

                          {/* NGO Info */}
                          <div style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 8, padding: '12px 14px', fontSize: '0.82rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--color-teal)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                              🏢 Assigned NGO
                            </div>
                            {ngo ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, color: 'var(--text-secondary)' }}>
                                <div>NGO: <strong style={{ color: 'var(--text-primary)' }}>{ngo.ngoName}</strong></div>
                                <div>Email: <strong style={{ color: 'var(--text-primary)' }}>{ngo.ngoEmail}</strong></div>
                                {ngo.ngoPhone && <div>Phone: <strong style={{ color: 'var(--text-primary)' }}>📞 {ngo.ngoPhone}</strong></div>}
                                <div>Location: <strong style={{ color: 'var(--text-primary)' }}>📍 {ngo.ngoCity}, {ngo.ngoState}</strong></div>
                                <div>Approved: <strong style={{ color: ngo.isApproved ? '#4ade80' : '#f87171' }}>{ngo.isApproved ? '✅ Yes' : '⏳ No'}</strong></div>
                              </div>
                            ) : (
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>General donation — no NGO assigned</div>
                            )}
                          </div>
                        </div>

                        {/* Pickup Address + Token */}
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          <span>📍 Pickup: {d.contactDetails?.fullAddress}, {d.contactDetails?.city}</span>
                        </div>

                        {/* Verification token */}
                        {d.verificationToken && (
                          <div style={{ padding: '8px 14px', background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.18)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
                            <div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Verification Code</div>
                              <strong style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--color-orange)', letterSpacing: 3 }}>{d.verificationToken}</strong>
                            </div>
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=56x56&data=${encodeURIComponent(JSON.stringify({ type: 'donation', donationId: d._id, verificationCode: d.verificationToken, token: d.verificationToken }))}`}
                              alt="QR"
                              style={{ width: 56, height: 56, borderRadius: 4, background: '#fff', padding: 2 }}
                            />
                          </div>
                        )}

                        {/* Completion info */}
                        {(sNorm === 'DONE' || sNorm === 'COMPLETED') && (
                          <div style={{ padding: '8px 12px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 8, fontSize: '0.82rem', color: '#4ade80', marginBottom: 14 }}>
                            ✅ Completed at: {d.completedAt ? new Date(d.completedAt).toLocaleString('en-IN') : '—'}
                            {d.pickedUpByNgo?.ngoName && ` · Picked up by ${d.pickedUpByNgo.ngoName}`}
                          </div>
                        )}

                        {/* Rejection reason */}
                        {sNorm === 'REJECTED' && d.rejectedReason && (
                          <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, fontSize: '0.82rem', color: '#f87171', marginBottom: 14 }}>
                            ⚠️ Rejection reason: {d.rejectedReason}
                          </div>
                        )}

                        {/* Admin Actions */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                          <ActionBtn icon="🔍" label="Full Review" onClick={() => setReviewDonation(d)} />
                          {d.status === 'pending' && (
                            <>
                              <ActionBtn icon="✅" label="Approve" onClick={() => approveDonation(d._id)} variant="teal" />
                              <ActionBtn icon="✕" label="Reject" onClick={() => setRejectModal(d._id)} variant="danger" />
                            </>
                          )}
                          {(sNorm === 'NGOACCEPTED' || sNorm === 'APPROVED' || sNorm === 'REQUESTACCEPTED') && (
                            <ActionBtn icon="📦" label="Mark as Done" onClick={() => setVerificationModal(d._id)} variant="teal" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

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
            {/* Filter bar */}
            <div className="filter-bar" style={{ marginBottom: 20 }}>
              {['all', 'pending', 'approved'].map(f => (
                <button key={f} className={`filter-btn ${ngoFilter === f ? 'filter-btn--active' : ''}`}
                  onClick={() => setNgoFilter(f)}>
                  {f === 'all' ? 'All NGOs' : f === 'pending' ? 'Pending Approval' : 'Approved'}
                  <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.08)', padding: '0 6px', borderRadius: 99, fontSize: '0.7rem' }}>
                    {f === 'all' ? ngos.length : f === 'pending' ? ngos.filter(n => !n.isApproved).length : ngos.filter(n => n.isApproved).length}
                  </span>
                </button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {ngos.length} total NGO{ngos.length !== 1 ? 's' : ''}
              </span>
            </div>
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
                <h3 className="empty-state__title">No NGOs registered yet</h3>
                <p className="empty-state__text">NGOs will appear here once they register on the platform.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {ngos
                  .filter(ngo => ngoFilter === 'all' ? true : ngoFilter === 'pending' ? !ngo.isApproved : ngo.isApproved)
                  .map((ngo, idx) => (
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
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8 }}>
                          {/* Registration Certificate */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <strong>Registration Cert:</strong>
                            {ngo.ngoDocuments?.certificationOfRegistration ? (
                              ngo.ngoDocuments.certificationOfRegistration.startsWith('http') ? (
                                <a href={ngo.ngoDocuments.certificationOfRegistration} target="_blank" rel="noreferrer"
                                  style={{ color: 'var(--color-teal)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  📎 View Document
                                </a>
                              ) : (
                                <span>{ngo.ngoDocuments.certificationOfRegistration}</span>
                              )
                            ) : <span style={{ color: 'var(--color-red)' }}>Not uploaded</span>}
                            {ngo.registrationCertificateNumber && (
                              <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 6, color: 'var(--text-secondary)' }}>
                                No: <strong>{ngo.registrationCertificateNumber}</strong>
                              </span>
                            )}
                          </div>
                          {/* PAN Card */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <strong>PAN Card:</strong>
                            {ngo.ngoDocuments?.ownerPanCard ? (
                              ngo.ngoDocuments.ownerPanCard.startsWith('http') ? (
                                <a href={ngo.ngoDocuments.ownerPanCard} target="_blank" rel="noreferrer"
                                  style={{ color: 'var(--color-teal)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  📎 View Document
                                </a>
                              ) : (
                                <span>{ngo.ngoDocuments.ownerPanCard}</span>
                              )
                            ) : <span style={{ color: 'var(--color-red)' }}>Not uploaded</span>}
                            {ngo.panCardNumber && (
                              <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 6, color: 'var(--text-secondary)' }}>
                                No: <strong>{ngo.panCardNumber}</strong>
                              </span>
                            )}
                          </div>
                          {ngo.ngoDocuments?.prevousWorkReport && (
                            <div style={{ whiteSpace: 'pre-wrap' }}><strong>Previous Work:</strong> {ngo.ngoDocuments.prevousWorkReport}</div>
                          )}
                          {/* Registered by */}
                          {ngo.registeredBy && (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>
                              👤 Registered by: {ngo.registeredBy.firstName} {ngo.registeredBy.surname} ({ngo.registeredBy.email})
                            </div>
                          )}
                          {/* Approved info */}
                          {ngo.isApproved && ngo.approvedAt && (
                            <div style={{ color: '#4ade80', fontSize: '0.75rem', marginTop: 2 }}>
                              ✅ Approved on {new Date(ngo.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
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


        {/* ─── NGO REQUESTS ─── */}
        {tab === 'ngo-requests' && (
          <div style={{ animation: 'fadeInUp 0.3s ease' }}>
            {/* Filter bar */}
            <div className="filter-bar" style={{ marginBottom: 20 }}>
              {['all', 'pending', 'approved', 'rejected', 'fulfilled'].map(f => (
                <button key={f} className={`filter-btn ${ngoRequestFilter === f ? 'filter-btn--active' : ''}`} onClick={() => setNgoRequestFilter(f)}>
                  {f === 'all' ? 'All' : f === 'fulfilled' ? 'Fulfilled' : f.charAt(0).toUpperCase() + f.slice(1)}
                  {f !== 'all' && ngoRequests.length > 0 && (
                    <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.08)', padding: '0 6px', borderRadius: 99, fontSize: '0.7rem' }}>
                      {ngoRequests.filter(r => r.status === f).length}
                    </span>
                  )}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {filteredNgoRequests.length} result{filteredNgoRequests.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} className="skeleton" style={{ height: 140, borderRadius: 'var(--radius-lg)' }} />
                ))}
              </div>
            ) : filteredNgoRequests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">📋</div>
                <h3 className="empty-state__title">No NGO food requests</h3>
                <p className="empty-state__text">No requests from NGOs in your city yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {filteredNgoRequests.map((req, idx) => {
                  const urgency = URGENCY_MAP[req.urgencyLevel] || URGENCY_MAP.medium;
                  const statusInfo = NGO_REQ_STATUS_MAP[req.status] || NGO_REQ_STATUS_MAP.pending;
                  return (
                    <div key={req._id} style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', animation: 'fadeInUp 0.3s ease both', animationDelay: `${idx * 0.05}s` }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                        <div>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginBottom: 6 }}>
                            #{String(req._id).slice(-8).toUpperCase()}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 4 }}>
                            {req.ngoId?.ngoName || '—'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            📍 {req.ngoId?.ngoCity}, {req.ngoId?.ngoState} · {req.ngoId?.ngoEmail}
                          </div>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            Submitted by {req.requestedBy?.firstName} {req.requestedBy?.surname} · {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, background: urgency.bg, color: urgency.color }}>
                            🔥 {urgency.label} Priority
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700, background: statusInfo.bg, color: statusInfo.color }}>
                            {statusInfo.icon} {statusInfo.label}
                          </span>
                        </div>
                      </div>

                      {/* Food items */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-orange)', marginBottom: 8 }}>
                          🍱 Food Items Requested ({(req.foodItemsNeeded || []).length})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {(req.foodItemsNeeded || []).map((item, i) => (
                            <span key={i} style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--color-orange)', padding: '3px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600 }}>
                              {item.foodName} · {item.quantity}{item.quantityType} ({item.category})
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Purpose */}
                      <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Purpose:</strong> {req.purpose}
                      </div>

                      {/* Meta */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: 10, marginBottom: 14 }}>
                        {req.numberOfBeneficiaries > 0 && <span>👥 {req.numberOfBeneficiaries} beneficiaries</span>}
                        <span>📍 {req.contactDetails?.city}</span>
                        <span>📞 {req.contactDetails?.contactPersonName} · {req.contactDetails?.phoneNumber}</span>
                        {req.approvedAt && <span style={{ color: '#4ade80' }}>✅ Approved {new Date(req.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                        {req.fulfilledAt && <span style={{ color: '#a78bfa' }}>🚚 Fulfilled {new Date(req.fulfilledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                      </div>

                      {/* Fulfillment & Acceptor Details */}
                      {req.acceptedBy && (
                        <div style={{ 
                          background: 'rgba(6, 182, 212, 0.04)', 
                          border: '1px solid rgba(6, 182, 212, 0.15)', 
                          borderRadius: 8, 
                          padding: '12px 16px', 
                          marginBottom: 14,
                          fontSize: '0.82rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontWeight: 700, color: 'var(--color-teal)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              🤝 Accepted by Donor
                            </span>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: 4, 
                              fontSize: '0.72rem', 
                              fontWeight: 700, 
                              textTransform: 'uppercase',
                              background: req.status === 'fulfilled' ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)',
                              color: req.status === 'fulfilled' ? '#4ade80' : '#fbbf24'
                            }}>
                              {req.status === 'fulfilled' ? 'Done / Completed' : 'In Progress / Pending Delivery'}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, color: 'var(--text-secondary)' }}>
                            <div>
                              <strong>Donor Name:</strong> {req.acceptedBy.firstName} {req.acceptedBy.surname}
                            </div>
                            <div>
                              <strong>Email:</strong> {req.acceptedBy.email}
                            </div>
                            {req.acceptedBy.phone && (
                              <div>
                                <strong>Phone:</strong> {req.acceptedBy.phone}
                              </div>
                            )}
                            {req.expectedDeliveryDate && (
                              <div>
                                <strong>Expected Delivery:</strong> {new Date(req.expectedDeliveryDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                            {req.verificationToken && (
                              <div>
                                <strong>Verification Token:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-orange)', letterSpacing: 0.5 }}>{req.verificationToken}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Rejection reason */}
                      {req.status === 'rejected' && req.rejectedReason && (
                        <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)', fontSize: '0.82rem', color: '#f87171' }}>
                          ⚠️ Rejected: {req.rejectedReason}
                        </div>
                      )}

                      {/* Delivery address */}
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                        🏠 Delivery: {req.contactDetails?.deliveryAddress}, {req.contactDetails?.city}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {req.status === 'pending' && (
                          <>
                            <ActionBtn icon="✅" label="Approve" onClick={() => approveNgoRequest(req._id)} variant="teal" />
                            <ActionBtn icon="✕" label="Reject" onClick={() => setNgoRejectModal(req._id)} variant="danger" />
                          </>
                        )}
                        {req.status === 'approved' && (
                          <ActionBtn icon="🚚" label="Mark Fulfilled" onClick={() => fulfillNgoRequest(req._id)} variant="primary" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Reject Modal (Donations) */}
      {rejectModal && (
        <RejectModal
          onConfirm={(reason) => rejectDonation(rejectModal, reason)}
          onCancel={() => setRejectModal(null)}
        />
      )}

      {/* Reject Modal (NGO Requests) */}
      {ngoRejectModal && (
        <RejectModal
          onConfirm={(reason) => rejectNgoRequest(ngoRejectModal, reason)}
          onCancel={() => setNgoRejectModal(null)}
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
          onMarkAsDone={() => {
            setVerificationModal(reviewDonation._id);
            setReviewDonation(null);
          }}
          onUpdateQuantities={() => {
            fetchDonations();
            // Also update the reviewDonation modal content with the freshly fetched info
            api.get('/aahar/admin/getFoodInfoByCity').then(res => {
              const fresh = (res.data?.foodInfo || []).find(x => x._id === reviewDonation._id);
              if (fresh) setReviewDonation(fresh);
            });
          }}
          onClose={() => setReviewDonation(null)}
        />
      )}

      {/* Verification Modal */}
      {verificationModal && (
        <VerificationModal
          onConfirm={(code) => markAsDone(verificationModal, code)}
          onCancel={() => setVerificationModal(null)}
        />
      )}
    </div>
  );
}
