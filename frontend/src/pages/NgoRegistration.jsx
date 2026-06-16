import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axios';
import { showToast } from '../components/Toast';

const SECTIONS = [
  {
    key: 'basic',
    title: '🏢 NGO Information',
    desc: 'Tell us about your organization',
    fields: [
      { name: 'ngoName', label: 'NGO Name', placeholder: 'e.g. Helping Hands Foundation', required: true },
      { name: 'ngoEmail', label: 'Official Email', type: 'email', placeholder: 'ngo@example.org', required: true },
      { name: 'ngoPhone', label: 'Phone Number', type: 'tel', placeholder: '10-digit mobile number', required: true },
      { name: 'ngoWebsite', label: 'NGO Website *', type: 'url', placeholder: 'https://your-ngo.org', required: true },
    ],
  },
  {
    key: 'location',
    title: '📍 Location',
    desc: 'Where does your NGO operate?',
    fields: [
      { name: 'ngoAddress', label: 'Full Address', placeholder: 'Street, Area, Landmark', required: true, textarea: true },
      { name: 'ngoCity', label: 'City', placeholder: 'Mumbai', required: true },
      { name: 'ngoState', label: 'State', placeholder: 'Maharashtra', required: true },
    ],
  },
  {
    key: 'purpose',
    title: '🎯 Mission & Purpose',
    desc: 'Tell us what your NGO does',
    fields: [
      { name: 'ngoPurpose', label: 'NGO Purpose / Mission', placeholder: 'Describe your work — who do you serve and how do you help?', required: true, textarea: true },
    ],
  },
  {
    key: 'docs',
    title: '📄 Documentation',
    desc: 'Provide registration and verification details',
    fields: [
      { name: 'certificationOfRegistration', label: 'Registration Certificate Number', placeholder: 'NGO Darpan / Trust / Society Reg No.', required: true },
      { name: 'ownerPanCard', label: 'Owner/Director PAN Card No.', placeholder: 'ABCDE1234F', required: true },
      { name: 'prevousWorkReport', label: 'Previous Work Summary *', placeholder: 'Brief description of past projects and impact', required: true, textarea: true },
    ],
  },
];

export default function NgoRegistration() {
  const navigate = useNavigate();
  const { user, sendAadhaarOTP, verifyAadhaarOTP } = useAuth();
  const [form, setForm] = useState({
    ngoName: '', ngoEmail: '', ngoPhone: '', ngoAddress: '', ngoCity: '',
    ngoState: '', ngoPurpose: '', ngoWebsite: '', certificationOfRegistration: '',
    ownerPanCard: '', prevousWorkReport: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Aadhaar lock state
  const [aadhaarNum, setAadhaarNum] = useState('');
  const [otpVal, setOtpVal] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.ngoName.trim()) errs.ngoName = 'Required';
    if (!form.ngoEmail.trim()) errs.ngoEmail = 'Required';
    else if (!/\S+@\S+\.\S+/.test(form.ngoEmail)) errs.ngoEmail = 'Invalid email';
    if (!form.ngoPhone.trim()) errs.ngoPhone = 'Required';
    else if (!/^\d{10}$/.test(form.ngoPhone.replace(/\s/g, ''))) errs.ngoPhone = 'Enter a valid 10-digit number';
    if (!form.ngoAddress.trim()) errs.ngoAddress = 'Required';
    if (!form.ngoCity.trim()) errs.ngoCity = 'Required';
    if (!form.ngoState.trim()) errs.ngoState = 'Required';
    if (!form.ngoPurpose.trim()) errs.ngoPurpose = 'Required';
    if (!form.ngoWebsite.trim()) errs.ngoWebsite = 'Required';
    if (!form.certificationOfRegistration.trim()) errs.certificationOfRegistration = 'Required';
    if (!form.ownerPanCard.trim()) errs.ownerPanCard = 'Required';
    if (!form.prevousWorkReport.trim()) errs.prevousWorkReport = 'Required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); showToast('Please fix the errors above', 'error'); return; }
    setLoading(true);
    try {
      await api.post('/aahar/ngo/aahaarNgoDetails', form);
      setSubmitted(true);
      showToast('NGO registration submitted! 🎉 You will be notified after review.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Registration failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Gating checks
  if (!user) {
    return (
      <div className="ngo-page">
        <div className="ngo-hero">
          <div className="container">
            <div className="section-tag" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', color: 'var(--color-red)' }}>
              🔒 Access Restricted
            </div>
            <h1 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 800, marginBottom: 12 }}>
              Partner With <span style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Aahaar</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
              Join us in our mission to feed the needy. To register an NGO, you must log in first.
            </p>
          </div>
        </div>
        <div className="ngo-form-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh', padding: '0 24px' }}>
          <div className="glass-card" style={{ maxWidth: 500, width: '100%', padding: '40px 32px', textAlign: 'center', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div style={{ fontSize: '4.5rem', marginBottom: 20, animation: 'float 3s ease-in-out infinite' }}>🔒</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 12 }}>Authentication Required</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 28 }}>
              To register and partner your NGO with Aahaar, you must have an active verified account.
              Please sign in or create a new account to get started.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <Link to="/login" className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'linear-gradient(135deg,#06b6d4,#0284c7)' }}>
                Sign In
              </Link>
              <Link to="/register" className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user.isVerified) {
    return (
      <div className="ngo-page">
        <div className="ngo-hero">
          <div className="container">
            <div className="section-tag" style={{ background: 'rgba(234,179,8,0.1)', borderColor: 'rgba(234,179,8,0.2)', color: 'var(--color-yellow)' }}>
              🛡️ Verification Pending
            </div>
            <h1 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 800, marginBottom: 12 }}>
              Partner With <span style={{ background: 'linear-gradient(135deg,#fbbf24,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Aahaar</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
              Join us in our mission to feed the needy. Please verify your identity to proceed.
            </p>
          </div>
        </div>
        <div className="ngo-form-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', padding: '0 24px' }}>
          <div className="glass-card" style={{ maxWidth: 500, width: '100%', padding: '40px 32px', textAlign: 'center', border: '1px solid rgba(234,179,8,0.15)' }}>
            <div style={{ fontSize: '4.5rem', marginBottom: 20, animation: 'float 3s ease-in-out infinite' }}>🛡️</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 12 }}>Aadhaar Verification Required</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 28 }}>
              To verify and establish a secure NGO profile, please complete Aadhaar verification.
              Once verified, you will immediately unlock the NGO registration form.
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
                <Link to="/" className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', background: 'linear-gradient(135deg,#06b6d4,#0284c7)' }}
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

  if (submitted) {
    return (
      <div className="ngo-page">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: '5rem', marginBottom: 24, animation: 'fadeInUp 0.5s ease' }}>🎉</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 12 }}>
            Registration <span className="gradient-text">Submitted!</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: 480, lineHeight: 1.7, marginBottom: 32 }}>
            Thank you for registering <strong style={{ color: 'var(--text-primary)' }}>{form.ngoName}</strong> with Aahaar.
            Our admin team will review your application and notify you within 2–3 business days.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/" className="btn-primary" style={{ padding: '12px 28px' }}>🏠 Go Home</Link>
            <Link to="/login" className="btn-secondary" style={{ padding: '12px 28px' }}>Sign In →</Link>
          </div>
        </div>
      </div>
    );
  }

  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <div className="ngo-page">
      {/* Hero */}
      <div className="ngo-hero">
        <div className="container">
          <div className="section-tag" style={{ background: 'rgba(6,182,212,0.1)', borderColor: 'rgba(6,182,212,0.2)', color: 'var(--color-teal)' }}>
            🤝 NGO Partnership
          </div>
          <h1 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 800, marginBottom: 12 }}>
            Register Your <span style={{ background: 'linear-gradient(135deg,#06b6d4,#0284c7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>NGO</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
            Partner with Aahaar to receive surplus food donations in your city and make an even bigger impact.
          </p>

          {/* Benefits */}
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
            {['🏙️ City-specific NGO matching', '📲 Real-time donation alerts', '✅ Admin-verified listing', '📊 Impact tracking dashboard'].map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', padding: '7px 16px', borderRadius: 99 }}>
                {b}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="ngo-form-wrapper">
        {hasErrors && (
          <div style={{ padding: '14px 18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', color: '#f87171', fontSize: '0.875rem', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center' }}>
            ⚠️ Please fix the highlighted errors before submitting.
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {SECTIONS.map((section, si) => (
            <div key={section.key} className="form-card" style={{ marginBottom: 20, animationDelay: `${si * 0.1}s`, animation: 'fadeInUp 0.4s ease both' }}>
              <div style={{ marginBottom: 20 }}>
                <div className="form-card__title">{section.title}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{section.desc}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: section.fields.length > 2 ? '1fr 1fr' : '1fr', gap: 16 }}>
                {section.fields.map(field => (
                  <div key={field.name} className="form-group" style={{ gridColumn: field.textarea ? '1 / -1' : undefined }}>
                    <label className="form-label">
                      {field.label} {field.required && <span style={{ color: 'var(--color-red)' }}>*</span>}
                    </label>
                    {field.textarea ? (
                      <textarea
                        name={field.name}
                        className={`form-input ${errors[field.name] ? 'error' : ''}`}
                        placeholder={field.placeholder}
                        value={form[field.name]}
                        onChange={handleChange}
                        rows={3}
                        style={{ resize: 'vertical' }}
                      />
                    ) : (
                      <input
                        name={field.name}
                        type={field.type || 'text'}
                        className={`form-input ${errors[field.name] ? 'error' : ''}`}
                        placeholder={field.placeholder}
                        value={form[field.name]}
                        onChange={handleChange}
                      />
                    )}
                    {errors[field.name] && <span className="form-error">⚠ {errors[field.name]}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Terms notice */}
          <div style={{ padding: '16px 20px', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
            <strong style={{ color: 'var(--color-teal)' }}>ℹ️ What happens next?</strong><br />
            After submission, our admin will verify your documents and approve your NGO within 2–3 business days.
            Once approved, you'll receive food donation notifications in your city.
          </div>

          <button type="submit" className="btn-primary" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '15px', fontSize: '1rem', background: 'linear-gradient(135deg,#06b6d4,#0284c7)' }}>
            {loading ? <><span className="spinner" /> Submitting...</> : '🚀 Submit NGO Registration'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Already registered? <Link to="/login" style={{ color: 'var(--color-teal)', fontWeight: 600, textDecoration: 'none' }}>Sign in →</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
