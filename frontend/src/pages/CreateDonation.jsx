import { useState, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axios';
import { showToast } from '../components/Toast';


const CATEGORIES = ['Fruits', 'Vegetables', 'Bakery', 'Dairy', 'Cooked Meals', 'Beverages', 'Packaged Food', 'Grains', 'Others'];
const QTY_TYPES = ['kg', 'g', 'ml', 'l', 'pcs'];

function makeItem(donorId) {
  return { foodName: '', category: '', quantity: '', quantityType: 'kg', expiryDate: '', packaging: '', imageUrl: [], donorId };
}

const STEPS = [
  { label: 'Food Items', icon: '🍱', desc: 'What are you donating?' },
  { label: 'Contact Info', icon: '📞', desc: 'Pickup details' },
  { label: 'Review', icon: '✅', desc: 'Confirm & submit' },
];

export default function CreateDonation() {
  const { user, sendAadhaarOTP, verifyAadhaarOTP } = useAuth();
  const navigate = useNavigate();
  const donorId = user?._id || user?.id;

  const [step, setStep] = useState(0);
  const [items, setItems] = useState([makeItem(donorId)]);
  const [contact, setContact] = useState({ fullAddress: '', city: user?.city || '', contactPersonName: user?.firstName ? `${user.firstName} ${user.surname || ''}`.trim() : '', phoneNumber: '', email: user?.email || '' });
  const ngoPreference = 'random';
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Aadhaar lock state
  const [aadhaarNum, setAadhaarNum] = useState('');
  const [otpVal, setOtpVal] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
    if (errors[`item_${idx}_${field}`]) setErrors(prev => { const n = {...prev}; delete n[`item_${idx}_${field}`]; return n; });
  };

  const addItem = () => setItems(prev => [...prev, makeItem(donorId)]);
  const removeItem = (idx) => { if (items.length > 1) setItems(prev => prev.filter((_, i) => i !== idx)); };

  const validateStep0 = () => {
    const errs = {};
    items.forEach((it, i) => {
      if (!it.foodName.trim()) errs[`item_${i}_foodName`] = 'Required';
      if (!it.category) errs[`item_${i}_category`] = 'Required';
      if (!it.quantity || isNaN(it.quantity) || +it.quantity <= 0) errs[`item_${i}_quantity`] = 'Enter a valid quantity > 0';
      if (!it.expiryDate) errs[`item_${i}_expiryDate`] = 'Required';
      else if (new Date(it.expiryDate) < new Date()) errs[`item_${i}_expiryDate`] = 'Date must be in the future';
    });
    return errs;
  };
  const validateStep1 = () => {
    const errs = {};
    if (!contact.fullAddress.trim()) errs.fullAddress = 'Required';
    if (!contact.city.trim()) errs.city = 'Required';
    if (!contact.contactPersonName.trim()) errs.contactPersonName = 'Required';
    if (!contact.phoneNumber.trim()) errs.phoneNumber = 'Required';
    else if (!/^\d{10}$/.test(contact.phoneNumber.replace(/\s/g, ''))) errs.phoneNumber = 'Enter a valid 10-digit number';
    if (!contact.email.trim()) errs.email = 'Required';
    else if (!/\S+@\S+\.\S+/.test(contact.email)) errs.email = 'Invalid email';
    return errs;
  };

  const next = () => {
    const errs = step === 0 ? validateStep0() : step === 1 ? validateStep1() : {};
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        foodItemDetails: items.map(it => ({
          ...it,
          quantity: Number(it.quantity),
          donorId,
        })),
        ...contact,
        ngoPreference,
      };
      await api.post('/aahar/foodInfo/createFoodInfo', payload);
      showToast('Donation submitted successfully! 🎉', 'success');
      navigate('/dashboard');
    } catch (err) {
      showToast(err.response?.data?.message || 'Submission failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  if (!user?.isVerified) {
    return (
      <div className="create-donation-page">
        <div className="create-donation-header">
          <div className="container">
            <div className="breadcrumb">
              <Link to="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Dashboard</Link>
              <span>/</span>
              <span>Create Donation</span>
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 8, marginBottom: 6 }}>
              Create Food <span className="gradient-text">Donation</span> 🍱
            </h1>
          </div>
        </div>

        <div className="create-donation-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '65vh', padding: '40px 24px' }}>
          <div className="glass-card" style={{ maxWidth: 500, width: '100%', padding: '40px 32px', textAlign: 'center', border: '1px solid rgba(249,115,22,0.15)' }}>
            <div style={{ fontSize: '4.5rem', marginBottom: 20, animation: 'float 3s ease-in-out infinite' }}>🔒</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 12 }}>Aadhaar Verification Required</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 28 }}>
              To maintain the security and trust of our food distribution platform, please verify your identity using Aadhaar OTP.
              Once verified, you can immediately proceed to submit food donations.
            </p>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setOtpError('');
              if (!otpSent) {
                if (!/^\d{12}$/.test(aadhaarNum)) {
                  setOtpError('Aadhaar number must be exactly 12 digits');
                  return;
                }
                setOtpLoading(true);
                const res = await sendAadhaarOTP(aadhaarNum);
                setOtpLoading(false);
                if (res.success) {
                  setOtpSent(true);
                  showToast(res.message, 'success');
                } else {
                  setOtpError(res.error);
                }
              } else {
                if (!otpVal) {
                  setOtpError('Please enter the OTP code');
                  return;
                }
                setOtpLoading(true);
                const res = await verifyAadhaarOTP(aadhaarNum, otpVal);
                setOtpLoading(false);
                if (res.success) {
                  showToast('Aadhaar verified successfully! 🎉', 'success');
                } else {
                  setOtpError(res.error);
                }
              }
            }}>
              {!otpSent ? (
                <div className="form-group" style={{ marginBottom: 16, textAlign: 'left' }}>
                  <label className="form-label">Aadhaar Number</label>
                  <input
                    type="text"
                    maxLength={12}
                    className="form-input"
                    placeholder="1234 5678 9012"
                    value={aadhaarNum}
                    onChange={(e) => setAadhaarNum(e.target.value.replace(/\D/g, ''))}
                    disabled={otpLoading}
                  />
                </div>
              ) : (
                <div className="form-group" style={{ marginBottom: 16, textAlign: 'left' }}>
                  <label className="form-label">Enter OTP Code (use: 123456)</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="form-input"
                    placeholder="••••••"
                    value={otpVal}
                    onChange={(e) => setOtpVal(e.target.value.replace(/\D/g, ''))}
                    disabled={otpLoading}
                  />
                </div>
              )}

              {otpError && (
                <div style={{ color: 'var(--color-red)', fontSize: '0.82rem', marginBottom: 14, fontWeight: 600 }}>
                  ⚠️ {otpError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <Link to="/dashboard" className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={otpLoading}
                >
                  {otpLoading ? (
                    <><span className="spinner" /> Loading...</>
                  ) : !otpSent ? (
                    'Verify Identity'
                  ) : (
                    'Confirm OTP'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-donation-page">
      {/* Header */}
      <div className="create-donation-header">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Dashboard</Link>
            <span>/</span>
            <span>Create Donation</span>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 8, marginBottom: 6 }}>
            Create Food <span className="gradient-text">Donation</span> 🍱
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            List your excess food and connect with NGOs in your city who need it.
          </p>
        </div>
      </div>

      <div className="create-donation-body">
        <div className="container" style={{ maxWidth: 800 }}>
          {/* Step Indicator */}
          <div className="step-indicator">
            {STEPS.map((s, i) => (
              <Fragment key={i}>
                <div className="step-indicator__item">
                  <div className={`step-indicator__circle ${i < step ? 'step-indicator__circle--done' : i === step ? 'step-indicator__circle--active' : ''}`}>
                    {i < step ? '✓' : s.icon}
                  </div>
                  <div>
                    <div className={`step-indicator__label ${i === step ? 'step-indicator__label--active' : ''}`}>{s.label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.desc}</div>
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`step-indicator__line ${i < step ? 'step-indicator__line--done' : ''}`} />
                )}
              </Fragment>
            ))}
          </div>

          {/* Step 0 — Food Items */}
          {step === 0 && (
            <div style={{ animation: 'fadeInUp 0.35s ease' }}>
              <div className="form-card">
                <div className="form-card__title">🍱 Food Items</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {items.map((item, idx) => (
                    <div key={idx} className="food-item-block">
                      <div className="food-item-block__header">
                        <span className="food-item-block__num">Item #{idx + 1}</span>
                        {items.length > 1 && (
                          <button className="btn-danger" style={{ fontSize: '0.78rem', padding: '5px 12px' }} onClick={() => removeItem(idx)}>
                            ✕ Remove
                          </button>
                        )}
                      </div>
                      <div className="food-item-grid">
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                          <label className="form-label">Food Name *</label>
                          <input type="text" className={`form-input ${errors[`item_${idx}_foodName`] ? 'error' : ''}`}
                            placeholder="e.g. Rice, Chapati, Apples" value={item.foodName}
                            onChange={e => updateItem(idx, 'foodName', e.target.value)} />
                          {errors[`item_${idx}_foodName`] && <span className="form-error">⚠ {errors[`item_${idx}_foodName`]}</span>}
                        </div>
                        <div className="form-group">
                          <label className="form-label">Category *</label>
                          <select className={`form-input ${errors[`item_${idx}_category`] ? 'error' : ''}`}
                            value={item.category} onChange={e => updateItem(idx, 'category', e.target.value)}>
                            <option value="">Select category</option>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          {errors[`item_${idx}_category`] && <span className="form-error">⚠ {errors[`item_${idx}_category`]}</span>}
                        </div>
                        <div className="form-group">
                          <label className="form-label">Quantity *</label>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input type="number" className={`form-input ${errors[`item_${idx}_quantity`] ? 'error' : ''}`}
                              placeholder="0" min="0.1" step="0.1" value={item.quantity}
                              onChange={e => updateItem(idx, 'quantity', e.target.value)} style={{ flex: 2 }} />
                            <select className="form-input" value={item.quantityType}
                              onChange={e => updateItem(idx, 'quantityType', e.target.value)} style={{ flex: 1 }}>
                              {QTY_TYPES.map(q => <option key={q} value={q}>{q}</option>)}
                            </select>
                          </div>
                          {errors[`item_${idx}_quantity`] && <span className="form-error">⚠ {errors[`item_${idx}_quantity`]}</span>}
                        </div>
                        <div className="form-group">
                          <label className="form-label">Expiry Date *</label>
                          <input type="date" className={`form-input ${errors[`item_${idx}_expiryDate`] ? 'error' : ''}`}
                            min={minDate} value={item.expiryDate}
                            onChange={e => updateItem(idx, 'expiryDate', e.target.value)} />
                          {errors[`item_${idx}_expiryDate`] && <span className="form-error">⚠ {errors[`item_${idx}_expiryDate`]}</span>}
                        </div>
                        <div className="form-group">
                          <label className="form-label">Packaging</label>
                          <input type="text" className="form-input" placeholder="e.g. Box, Container, Sealed bag"
                            value={item.packaging} onChange={e => updateItem(idx, 'packaging', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="add-item-btn" style={{ marginTop: 16 }} onClick={addItem} type="button">
                  ➕ Add Another Food Item
                </button>
              </div>
              <div className="form-nav">
                <Link to="/dashboard" className="btn-ghost">← Back to Dashboard</Link>
                <button className="btn-primary" onClick={next} style={{ padding: '12px 28px' }}>Continue →</button>
              </div>
            </div>
          )}

          {/* Step 1 — Contact Info */}
          {step === 1 && (
            <div style={{ animation: 'fadeInUp 0.35s ease' }}>
              <div className="form-card">
                <div className="form-card__title">📞 Pickup & Contact Details</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Full Pickup Address *</label>
                    <textarea className={`form-input ${errors.fullAddress ? 'error' : ''}`} rows={3}
                      placeholder="Building, Street, Area" value={contact.fullAddress}
                      onChange={e => { setContact(c => ({...c, fullAddress: e.target.value})); if (errors.fullAddress) setErrors(p => ({...p, fullAddress: ''})); }}
                      style={{ resize: 'vertical' }} />
                    {errors.fullAddress && <span className="form-error">⚠ {errors.fullAddress}</span>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label className="form-label">City *</label>
                      <input type="text" className={`form-input ${errors.city ? 'error' : ''}`}
                        placeholder="Mumbai" value={contact.city}
                        onChange={e => { setContact(c => ({...c, city: e.target.value})); if (errors.city) setErrors(p => ({...p, city: ''})); }} />
                      {errors.city && <span className="form-error">⚠ {errors.city}</span>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contact Person *</label>
                      <input type="text" className={`form-input ${errors.contactPersonName ? 'error' : ''}`}
                        placeholder="Your name" value={contact.contactPersonName}
                        onChange={e => { setContact(c => ({...c, contactPersonName: e.target.value})); if (errors.contactPersonName) setErrors(p => ({...p, contactPersonName: ''})); }} />
                      {errors.contactPersonName && <span className="form-error">⚠ {errors.contactPersonName}</span>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number *</label>
                      <input type="tel" className={`form-input ${errors.phoneNumber ? 'error' : ''}`}
                        placeholder="10-digit mobile" value={contact.phoneNumber}
                        onChange={e => { setContact(c => ({...c, phoneNumber: e.target.value})); if (errors.phoneNumber) setErrors(p => ({...p, phoneNumber: ''})); }} />
                      {errors.phoneNumber && <span className="form-error">⚠ {errors.phoneNumber}</span>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input type="email" className={`form-input ${errors.email ? 'error' : ''}`}
                        placeholder="contact@email.com" value={contact.email}
                        onChange={e => { setContact(c => ({...c, email: e.target.value})); if (errors.email) setErrors(p => ({...p, email: ''})); }} />
                      {errors.email && <span className="form-error">⚠ {errors.email}</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="form-nav">
                <button className="btn-ghost" onClick={() => setStep(0)}>← Back</button>
                <button className="btn-primary" onClick={next} style={{ padding: '12px 28px' }}>Review →</button>
              </div>
            </div>
          )}

          {/* Step 2 — Review */}
          {step === 2 && (
            <div style={{ animation: 'fadeInUp 0.35s ease' }}>
              <div className="form-card">
                <div className="form-card__title">✅ Review Your Donation</div>

                {/* Food Items Summary */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
                    Food Items ({items.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {items.map((it, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{it.foodName}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{it.category} · Expires {new Date(it.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--color-orange)', fontSize: '0.95rem' }}>{it.quantity} {it.quantityType}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact Summary */}
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
                    Pickup Info
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.875rem' }}>
                    {[['📍 Address', contact.fullAddress], ['🏙️ City', contact.city], ['👤 Contact', contact.contactPersonName], ['📱 Phone', contact.phoneNumber], ['✉️ Email', contact.email]].map(([k, v]) => (
                      <div key={k} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 3 }}>{k}</div>
                        <div style={{ fontWeight: 600 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notice */}
                <div style={{ marginTop: 20, padding: '14px 16px', background: 'rgba(249,115,22,0.08)', borderRadius: 10, border: '1px solid rgba(249,115,22,0.15)', fontSize: '0.85rem', color: 'var(--color-orange)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span>ℹ️</span>
                  <span>After submission, your donation will be reviewed by an admin. An NGO in your city will be notified for pickup once approved.</span>
                </div>
              </div>

              <div className="form-nav">
                <button className="btn-ghost" onClick={() => setStep(1)}>← Edit Details</button>
                <button className="btn-primary" onClick={handleSubmit} disabled={submitting} style={{ padding: '12px 32px' }}>
                  {submitting ? <><span className="spinner" /> Submitting...</> : '🚀 Submit Donation'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
