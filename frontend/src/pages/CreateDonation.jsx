import { useState, Fragment, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const donorId = user?._id || user?.id;

  const queryParams = new URLSearchParams(location.search);
  const preSelectedNgoId = location.state?.ngoId || queryParams.get('ngoId');

  const [step, setStep] = useState(0);
  const [items, setItems] = useState([makeItem(donorId)]);
  const [contact, setContact] = useState({ fullAddress: '', city: user?.city || '', contactPersonName: user?.firstName ? `${user.firstName} ${user.surname || ''}`.trim() : '', phoneNumber: '', email: user?.email || '' });
  
  const [ngoPreference, setNgoPreference] = useState(preSelectedNgoId || 'random');
  const [cityNgos, setCityNgos] = useState([]);
  const [loadingNgos, setLoadingNgos] = useState(false);
  
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successDonation, setSuccessDonation] = useState(null);

  useEffect(() => {
    let active = true;
    if (preSelectedNgoId) {
      Promise.resolve().then(() => {
        if (active) setLoadingNgos(true);
      });
      api.get(`/aahar/ngo/${preSelectedNgoId}`)
        .then(res => {
          if (active && res.data?.ngo) {
            setCityNgos([res.data.ngo]);
          }
        })
        .catch(err => {
          console.error("Failed to fetch pre-selected NGO", err);
          if (active) setCityNgos([]);
        })
        .finally(() => {
          if (active) setLoadingNgos(false);
        });
      return () => { active = false; };
    }

    if (!contact.city || !contact.city.trim()) {
      Promise.resolve().then(() => {
        if (active) setCityNgos([]);
      });
      return;
    }
    
    Promise.resolve().then(() => {
      if (active) setLoadingNgos(true);
    });
    
    api.get(`/aahar/ngo/city/${contact.city}`)
      .then(res => {
        if (active) {
          setCityNgos(res.data?.ngoDetails || []);
        }
      })
      .catch(() => {
        if (active) {
          setCityNgos([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingNgos(false);
        }
      });

    return () => {
      active = false;
    };
  }, [contact.city, preSelectedNgoId]);

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
      const res = await api.post('/aahar/foodInfo/createFoodInfo', payload);
      showToast('Donation submitted successfully! 🎉', 'success');
      if (res.data?.foodInfo) {
        setSuccessDonation(res.data.foodInfo);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Submission failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  if (successDonation) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(JSON.stringify({
      type: 'donation',
      id: successDonation._id,
      donationId: successDonation._id,
      donorId,
      ngoId: successDonation.ngoPreference,
      token: successDonation.verificationToken,
      verificationCode: successDonation.verificationToken
    }))}`;
    const targetNgoName = successDonation.ngoPreference === 'random' 
      ? 'Directly Donate (Auto-assign)' 
      : cityNgos.find(n => n._id === successDonation.ngoPreference)?.ngoName || 'Selected NGO';

    return (
      <div className="create-donation-page">
        <div className="create-donation-header">
          <div className="container">
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 8, marginBottom: 6 }}>
              Donation <span className="gradient-text">Submitted!</span> 🎉
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Your pickup pass has been generated. Please save this screen or take note of the token.
            </p>
          </div>
        </div>

        <div className="create-donation-body" style={{ display: 'flex', justifyContent: 'center', padding: '40px 24px' }}>
          <div className="glass-card" style={{ maxWidth: 500, width: '100%', padding: '40px 32px', textAlign: 'center', border: '1px solid rgba(249,115,22,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>🍱</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Thank You for Donating!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.5 }}>
              Your food donation is pending admin approval. Once approved, the pickup will be scheduled.
            </p>

            {/* QR Code Container */}
            <div style={{
              background: '#ffffff',
              padding: 16,
              borderRadius: 12,
              width: 182,
              height: 182,
              marginBottom: 16,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img src={qrUrl} alt="Donation QR Pass" style={{ width: 150, height: 150 }} />
            </div>

            {/* Token Code */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                Verification Passcode
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
                {successDonation.verificationToken}
              </div>
            </div>

            {/* Verification Info Box */}
            <div style={{
              padding: '14px 16px',
              background: 'rgba(249,115,22,0.08)',
              borderRadius: 10,
              border: '1px solid rgba(249,115,22,0.15)',
              fontSize: '0.85rem',
              color: 'var(--color-orange)',
              textAlign: 'left',
              width: '100%',
              marginBottom: 28,
              lineHeight: 1.5
            }}>
              <strong>🛡️ Verification Rules:</strong>
              <div style={{ marginTop: 6 }}>
                {successDonation.ngoPreference === 'random' ? (
                  <span>This is a <strong>General Donation</strong>. Verification is handled exclusively by the <strong>Admin</strong> or approved delivery partners.</span>
                ) : (
                  <span>This is assigned to NGO: <strong>{targetNgoName}</strong>. Verification must be completed by representatives of that designated NGO or the Admin.</span>
                )}
              </div>
            </div>

            <button onClick={() => navigate('/dashboard')} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.95rem' }}>
              Go to Dashboard →
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: 28 }}>
              {user?.adharVerificationDocument ? (
                <span>Your Aadhaar card has been uploaded and is currently <strong>pending admin approval</strong>. Once verified, you will immediately be able to create food donations.</span>
              ) : (
                <span>To maintain the security and trust of our food distribution platform, please upload your Aadhaar card on your <strong>Dashboard</strong>. Once approved by our team, this page will unlock.</span>
              )}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <Link to="/dashboard" className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                Cancel
              </Link>
              <Link to="/dashboard" className="btn-primary" style={{ flex: 2, justifyContent: 'center', background: 'linear-gradient(135deg,#06b6d4,#0284c7)' }}>
                Go to Dashboard →
              </Link>
            </div>
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
                        <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: 10 }}>
                          <label className="form-label">Food Item Image</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <label style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '10px 16px',
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1.5px dashed var(--border-color)',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              color: 'var(--text-secondary)',
                              transition: 'all var(--transition-fast)'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-orange)'; e.currentTarget.style.color = 'var(--color-orange)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                            >
                              📁 Choose Photo
                              <input 
                                type="file" 
                                accept="image/*" 
                                style={{ display: 'none' }}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  
                                  const formData = new FormData();
                                  formData.append('foodImage', file);
                                  
                                  showToast('Uploading image...', 'info');
                                  
                                  try {
                                    const res = await api.post('/aahar/foodInfo/uploadFoodImages', formData, {
                                      headers: { 'Content-Type': 'multipart/form-data' }
                                    });
                                    const url = res.data?.imageUrls?.[0];
                                    if (url) {
                                      updateItem(idx, 'imageUrl', [url]);
                                      showToast('Image uploaded successfully! 📸', 'success');
                                    }
                                  } catch (err) {
                                    showToast(err.response?.data?.message || 'Image upload failed. Please try again.', 'error');
                                  }
                                }}
                              />
                            </label>

                            {item.imageUrl && item.imageUrl.length > 0 && (
                              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <img 
                                  src={item.imageUrl[0]} 
                                  alt="Preview" 
                                  style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border-color)' }} 
                                />
                                <button 
                                  type="button"
                                  onClick={() => updateItem(idx, 'imageUrl', [])}
                                  style={{
                                    position: 'absolute',
                                    top: -6,
                                    right: -6,
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    background: 'var(--color-red)',
                                    color: '#fff',
                                    fontSize: '0.65rem',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>
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
                  
                  <div className="form-group" style={{ marginTop: 16 }}>
                    <label className="form-label" style={{ marginBottom: 8 }}>NGO Preference (Choose who should receive this)</label>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                      {/* Card 1: Directly Donate */}
                      <div 
                        onClick={() => setNgoPreference('random')}
                        style={{
                          padding: 16,
                          borderRadius: 'var(--radius-md)',
                          border: `2px solid ${ngoPreference === 'random' ? 'var(--color-orange)' : 'var(--border-color)'}`,
                          background: ngoPreference === 'random' ? 'rgba(249, 115, 22, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                          cursor: 'pointer',
                          transition: 'all var(--transition-base)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          ⚡ Directly Donate
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          Auto-assign to any approved NGO in your area for fast pickup.
                        </div>
                      </div>

                      {/* Card 2: Donate to the NGO */}
                      <div 
                        onClick={() => {
                          if (cityNgos.length > 0) {
                            if (ngoPreference === 'random') {
                              setNgoPreference(cityNgos[0]._id);
                            }
                          } else if (contact.city.trim()) {
                            showToast(`No registered NGOs found in ${contact.city}`, 'info');
                          } else {
                            showToast('Please enter a city above first.', 'info');
                          }
                        }}
                        style={{
                          padding: 16,
                          borderRadius: 'var(--radius-md)',
                          border: `2px solid ${ngoPreference !== 'random' ? 'var(--color-orange)' : 'var(--border-color)'}`,
                          background: ngoPreference !== 'random' ? 'rgba(249, 115, 22, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                          cursor: cityNgos.length > 0 ? 'pointer' : 'not-allowed',
                          opacity: cityNgos.length > 0 ? 1 : 0.6,
                          transition: 'all var(--transition-base)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          🏢 Donate to NGO
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          Choose a specific verified NGO in your city to receive this donation.
                        </div>
                      </div>
                    </div>

                    {/* Specific NGO Dropdown Selection */}
                    {ngoPreference !== 'random' && cityNgos.length > 0 && (
                      <div style={{ animation: 'fadeIn 0.25s ease', marginTop: 8 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 4, display: 'block' }}>Select NGO from City List</label>
                        <select
                          className="form-input"
                          value={ngoPreference}
                          onChange={e => setNgoPreference(e.target.value)}
                          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 12 }}
                        >
                          {cityNgos.map(ngo => (
                            <option key={ngo._id} value={ngo._id}>
                              🏢 {ngo.ngoName} ({ngo.ngoPurpose || 'General purpose'})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {!contact.city.trim() && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                        ℹ️ Enter a city in the contact details above to see specific NGOs available in your area.
                      </span>
                    )}

                    {cityNgos.length === 0 && !loadingNgos && contact.city.trim() && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                        ℹ️ No registered NGOs found in "{contact.city}". You can only select Directly Donate (Auto-assign).
                      </span>
                    )}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {it.imageUrl && it.imageUrl.length > 0 && (
                            <img src={it.imageUrl[0]} alt="Food" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                          )}
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{it.foodName}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{it.category} · Expires {new Date(it.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                          </div>
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
                    {[
                      ['📍 Address', contact.fullAddress],
                      ['🏙️ City', contact.city],
                      ['👤 Contact', contact.contactPersonName],
                      ['📱 Phone', contact.phoneNumber],
                      ['✉️ Email', contact.email],
                      [
                        '🏢 NGO Preference',
                        ngoPreference === 'random'
                          ? 'Directly Donate (Auto-assign)'
                          : cityNgos.find(n => n._id === ngoPreference)?.ngoName || 'Selected NGO'
                      ]
                    ].map(([k, v]) => (
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
