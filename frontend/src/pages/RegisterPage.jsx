import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { showToast } from '../components/Toast';

const STEPS = ['Account Info', 'Personal Details', 'Location', 'Identity Verification'];

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry'
];

export default function RegisterPage() {
  const { register, uploadAadhaar, sendAadhaarOTP, verifyAadhaarOTP, loading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    firstName: '', surname: '', email: '', password: '', confirmPassword: '',
    age: '', city: '', state: '', country: 'India',
  });
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const [aadhaarFile, setAadhaarFile] = useState(null);

  // Aadhaar verification state
  const [verifMethod, setVerifMethod] = useState('otp'); // 'otp' or 'file'
  const [aadhaarNum, setAadhaarNum] = useState('');
  const [otpVal, setOtpVal] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateStep = (s) => {
    const errs = {};
    if (s === 0) {
      if (!form.email.trim()) errs.email = 'Required';
      else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
      if (!form.password) errs.password = 'Required';
      else if (form.password.length < 6) errs.password = 'Min 6 characters';
      if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    }
    if (s === 1) {
      if (!form.firstName.trim()) errs.firstName = 'Required';
      if (!form.surname.trim()) errs.surname = 'Required';
      if (!form.age) errs.age = 'Required';
      else if (isNaN(form.age) || +form.age < 16 || +form.age > 100) errs.age = 'Enter a valid age (16–100)';
    }
    if (s === 2) {
      if (!form.city.trim()) errs.city = 'Required';
      if (!form.state) errs.state = 'Required';
      if (!form.country.trim()) errs.country = 'Required';
    }
    return errs;
  };

  const nextStep = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setStep((s) => s + 1);
  };

  const prevStep = () => setStep((s) => s - 1);

  const handleSkip = async (e) => {
    if (e) e.preventDefault();
    setErrors({});
    setOtpLoading(true);
    const result = await register({
      firstName: form.firstName,
      surname: form.surname,
      email: form.email,
      password: form.password,
      age: Number(form.age),
      city: form.city,
      state: form.state,
      country: form.country,
    });
    setOtpLoading(false);
    if (result.success) {
      showToast(`Welcome to Aahaar, ${result.user.firstName}! 🎉`, 'success');
      navigate('/dashboard');
    } else {
      showToast(result.error || 'Registration failed', 'error');
      setErrors({ submit: result.error });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    if (verifMethod === 'otp') {
      if (!/^\d{12}$/.test(aadhaarNum)) {
        setErrors({ submit: 'Aadhaar number must be exactly 12 digits' });
        return;
      }
      if (!otpSent) {
        setOtpLoading(true);
        // Register the user first to log them in, because sending/verifying Aadhaar OTP endpoints require auth
        const regResult = await register({
          firstName: form.firstName,
          surname: form.surname,
          email: form.email,
          password: form.password,
          age: Number(form.age),
          city: form.city,
          state: form.state,
          country: form.country,
        });
        if (!regResult.success) {
          setOtpLoading(false);
          setErrors({ submit: regResult.error || 'Registration failed.' });
          return;
        }
        
        // Account registered, now send OTP
        const otpResult = await sendAadhaarOTP(aadhaarNum);
        setOtpLoading(false);
        if (otpResult.success) {
          setOtpSent(true);
          showToast('Account created and ' + otpResult.message, 'success');
        } else {
          // Registered but OTP failed
          showToast(`Account registered, but OTP failed: ${otpResult.error}. Please verify from dashboard.`, 'warning');
          navigate('/dashboard');
        }
        return;
      } else {
        if (!otpVal) {
          setErrors({ submit: 'Please enter the OTP code' });
          return;
        }
        setOtpLoading(true);
        // User is logged in now, verify OTP
        const verResult = await verifyAadhaarOTP(aadhaarNum, otpVal);
        setOtpLoading(false);
        if (verResult.success) {
          showToast('Aadhaar verified successfully! Welcome to Aahaar! 🎉', 'success');
          navigate('/dashboard');
        } else {
          setErrors({ submit: verResult.error || 'OTP verification failed. Please try again or skip.' });
        }
        return;
      }
    } else {
      // Document upload method
      const result = await register({
        firstName: form.firstName,
        surname: form.surname,
        email: form.email,
        password: form.password,
        age: Number(form.age),
        city: form.city,
        state: form.state,
        country: form.country,
      });
      if (result.success) {
        if (aadhaarFile) {
          showToast('Uploading Aadhaar...', 'success');
          const uploadResult = await uploadAadhaar(aadhaarFile);
          if (uploadResult.success) {
            showToast(`Welcome to Aahaar! Verification requested. 🎉`, 'success');
          } else {
            showToast(`Aadhaar failed: ${uploadResult.error}. Retry on your dashboard.`, 'warning');
          }
        } else {
          showToast(`Welcome to Aahaar, ${result.user.firstName}! 🎉`, 'success');
        }
        navigate('/dashboard');
      } else {
        showToast(result.error || 'Registration failed', 'error');
        setErrors({ submit: result.error });
      }
    }
  };

  const pwStrength = () => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const strength = pwStrength();
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][strength];
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'][strength];

  return (
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 'calc(var(--navbar-h) + 32px)', paddingBottom: 60 }}>
      <div className="auth-page__bg" />
      <div className="auth-page__glow auth-page__glow--1" />
      <div className="auth-page__glow auth-page__glow--2" />

      <div className="auth-card auth-card--wide" style={{ position: 'relative', zIndex: 1, maxWidth: 560 }}>
        {/* Header */}
        <div className="auth-card__brand">
          <span className="auth-card__brand-icon">🌾</span>
          <span className="gradient-text" style={{ fontWeight: 800, fontSize: '1.6rem' }}>Aahaar</span>
        </div>
        <h1 className="auth-card__title">Create Account</h1>
        <p className="auth-card__subtitle">Join thousands fighting hunger across India</p>

        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
          {STEPS.map((label, i) => (
            <React.Fragment key={i}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.85rem',
                  border: `2px solid ${i < step ? 'var(--color-green)' : i === step ? 'var(--color-orange)' : 'var(--border-color)'}`,
                  background: i < step ? 'var(--color-green)' : i === step ? 'rgba(249,115,22,0.1)' : 'transparent',
                  color: i < step ? '#fff' : i === step ? 'var(--color-orange)' : 'var(--text-muted)',
                  transition: 'all 0.3s ease',
                }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: i === step ? 'var(--text-primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1, height: 2, marginBottom: 18,
                  background: i < step ? 'var(--color-green)' : 'var(--border-color)',
                  transition: 'background 0.3s ease',
                }} />
              )}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Step 0 — Credentials */}
          {step === 0 && (
            <div className="auth-card__fields" style={{ animation: 'fadeInUp 0.3s ease' }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input name="email" type="email" className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="you@example.com" value={form.email} onChange={handleChange} autoComplete="email" />
                {errors.email && <span className="form-error">⚠ {errors.email}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input name="password" type={showPass ? 'text' : 'password'}
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    placeholder="Min 6 characters" value={form.password} onChange={handleChange} style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
                {form.password && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      {[1,2,3,4,5].map((n) => (
                        <div key={n} style={{ flex: 1, height: 3, borderRadius: 99, background: n <= strength ? strengthColor : 'var(--border-color)', transition: 'all 0.3s' }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>
                  </div>
                )}
                {errors.password && <span className="form-error">⚠ {errors.password}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input name="confirmPassword" type="password"
                  className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                  placeholder="Re-enter password" value={form.confirmPassword} onChange={handleChange} />
                {errors.confirmPassword && <span className="form-error">⚠ {errors.confirmPassword}</span>}
              </div>
              <button type="button" onClick={nextStep} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px', marginTop: 4 }}>
                Continue →
              </button>
            </div>
          )}

          {/* Step 1 — Personal */}
          {step === 1 && (
            <div className="auth-card__fields" style={{ animation: 'fadeInUp 0.3s ease' }}>
              <div className="auth-card__fields-grid">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input name="firstName" type="text" className={`form-input ${errors.firstName ? 'error' : ''}`}
                    placeholder="Priya" value={form.firstName} onChange={handleChange} />
                  {errors.firstName && <span className="form-error">⚠ {errors.firstName}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Surname</label>
                  <input name="surname" type="text" className={`form-input ${errors.surname ? 'error' : ''}`}
                    placeholder="Sharma" value={form.surname} onChange={handleChange} />
                  {errors.surname && <span className="form-error">⚠ {errors.surname}</span>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Age</label>
                <input name="age" type="number" className={`form-input ${errors.age ? 'error' : ''}`}
                  placeholder="25" value={form.age} onChange={handleChange} min={16} max={100} />
                {errors.age && <span className="form-error">⚠ {errors.age}</span>}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={prevStep} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '13px' }}>← Back</button>
                <button type="button" onClick={nextStep} className="btn-primary" style={{ flex: 2, justifyContent: 'center', padding: '13px' }}>Continue →</button>
              </div>
            </div>
          )}

          {/* Step 2 — Location */}
          {step === 2 && (
            <div className="auth-card__fields" style={{ animation: 'fadeInUp 0.3s ease' }}>
              <div className="form-group">
                <label className="form-label">City</label>
                <input name="city" type="text" className={`form-input ${errors.city ? 'error' : ''}`}
                  placeholder="Mumbai" value={form.city} onChange={handleChange} />
                {errors.city && <span className="form-error">⚠ {errors.city}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <select name="state" className={`form-input ${errors.state ? 'error' : ''}`} value={form.state} onChange={handleChange}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.state && <span className="form-error">⚠ {errors.state}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Country</label>
                <input name="country" type="text" className={`form-input ${errors.country ? 'error' : ''}`}
                  placeholder="India" value={form.country} onChange={handleChange} />
                {errors.country && <span className="form-error">⚠ {errors.country}</span>}
              </div>
              {errors.submit && <div className="auth-error-box">⚠️ {errors.submit}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={prevStep} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '13px' }}>← Back</button>
                <button type="button" onClick={nextStep} className="btn-primary" style={{ flex: 2, justifyContent: 'center', padding: '13px' }}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Identity Verification */}
          {step === 3 && (
            <div className="auth-card__fields" style={{ animation: 'fadeInUp 0.3s ease' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: '3rem' }}>🛡️</span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: 10, marginBottom: 6 }}>Trust Verification</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Aahaar builds a verified donor network. Choose to verify instantly via Aadhaar OTP or upload document for manual verification.
                </p>
              </div>

              {/* Tab Selector */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 10, border: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => { setVerifMethod('otp'); setErrors({}); }}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600,
                    background: verifMethod === 'otp' ? 'var(--grad-primary)' : 'transparent',
                    color: verifMethod === 'otp' ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.3s'
                  }}
                  disabled={otpLoading}
                >
                  ⚡ Instant OTP
                </button>
                <button
                  type="button"
                  onClick={() => { setVerifMethod('file'); setErrors({}); }}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600,
                    background: verifMethod === 'file' ? 'var(--grad-primary)' : 'transparent',
                    color: verifMethod === 'file' ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.3s'
                  }}
                  disabled={otpLoading}
                >
                  📁 Upload File
                </button>
              </div>

              {verifMethod === 'otp' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '0 0 8px' }}>
                    {!otpSent 
                      ? 'Enter your 12-digit Aadhaar number to verify instantly via simulated OTP.' 
                      : 'Simulated OTP sent! Enter OTP 123456 to verify and register.'}
                  </p>
                  {!otpSent ? (
                    <div className="form-group">
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
                    <div className="form-group">
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
                </div>
              ) : (
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Aadhaar Card (PDF / Image) *</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label className="btn-secondary" style={{ padding: '12px 20px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      📁 {aadhaarFile ? 'Change Aadhaar file' : 'Select Aadhaar Document'}
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setAadhaarFile(file);
                        }}
                      />
                    </label>
                    {aadhaarFile && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-teal)', fontWeight: 600, background: 'rgba(6,182,212,0.06)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(6,182,212,0.15)', wordBreak: 'break-all' }}>
                        Selected: {aadhaarFile.name} ({(aadhaarFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </div>
                    )}
                  </div>
                </div>
              )}

              {errors.submit && <div className="auth-error-box" style={{ color: 'var(--color-red)', fontSize: '0.82rem', marginBottom: 14, fontWeight: 600 }}>⚠️ {errors.submit}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={prevStep} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '13px' }} disabled={otpLoading}>← Back</button>
                <button type="submit" className="btn-primary" disabled={otpLoading}
                  style={{ flex: 2, justifyContent: 'center', padding: '13px' }}>
                  {otpLoading ? (
                    <><span className="spinner" /> Loading...</>
                  ) : verifMethod === 'otp' ? (
                    !otpSent ? 'Send OTP & Register' : 'Verify & Complete'
                  ) : (
                    'Register & Upload'
                  )}
                </button>
              </div>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button type="button" onClick={handleSkip} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }} disabled={otpLoading}>
                  Skip verification for now
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="auth-card__footer" style={{ marginTop: 20 }}>
          <span style={{ color: 'var(--text-muted)' }}>Already have an account?</span>
          <Link to="/login" className="auth-card__link">Sign in →</Link>
        </div>
      </div>
    </div>
  );
}
