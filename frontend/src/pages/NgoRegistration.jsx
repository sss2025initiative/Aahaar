import { useState, useRef, useEffect} from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axios';
import { showToast } from '../components/Toast';

// ─── File Upload Input ───────────────────────────────────────────────────────
function FileUploadInput({ label, name, required, accept, value, onChange, uploading, hint }) {
  const inputRef = useRef(null);
  const hasFile = !!value;

  return (
    <div style={{ gridColumn: '1 / -1' }}>
      <label className="form-label">
        {label} {required && <span style={{ color: 'var(--color-red)' }}>*</span>}
      </label>
      {hint && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>{hint}</div>
      )}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${hasFile ? 'var(--color-teal)' : 'var(--border-color)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '18px 20px',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: hasFile ? 'rgba(6,182,212,0.05)' : 'rgba(255,255,255,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          transition: 'all 0.2s',
          opacity: uploading ? 0.7 : 1,
        }}
        onMouseEnter={e => !hasFile && !uploading && (e.currentTarget.style.borderColor = 'var(--color-orange)')}
        onMouseLeave={e => !hasFile && !uploading && (e.currentTarget.style.borderColor = 'var(--border-color)')}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: hasFile ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem'
        }}>
          {uploading ? '⏳' : hasFile ? '✅' : '📄'}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {uploading ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--color-teal)', fontWeight: 600 }}>Uploading…</div>
          ) : hasFile ? (
            <>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-teal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {typeof value === 'string' && value.startsWith('http') ? '📎 Document uploaded' : value}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Click to replace</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Click to upload document</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                PDF, JPG, PNG — Max 5 MB
              </div>
            </>
          )}
        </div>
        {hasFile && !uploading && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(name, ''); }}
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '4px 8px', color: 'var(--color-red)', fontSize: '0.75rem', cursor: 'pointer', flexShrink: 0 }}
          >
            ✕ Remove
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept || 'image/*,.pdf'}
        style={{ display: 'none' }}
        onChange={e => onChange(name, e.target.files[0])}
      />
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function NgoRegistration() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    ngoName: '', ngoEmail: '', ngoPhone: '', ngoAddress: '', ngoCity: '',
    ngoState: '', ngoPurpose: '', ngoWebsite: '',
    prevousWorkReport: '',
    registrationCertificateNumber: '',
    panCardNumber: '',
  });

  // Document files (File objects until uploaded, then URL strings)
  const [certFile, setCertFile] = useState(null);       // File | null
  const [panFile, setPanFile] = useState(null);          // File | null
  const [certUrl, setCertUrl] = useState('');            // uploaded S3/local URL
  const [panUrl, setPanUrl] = useState('');              // uploaded S3/local URL
  const [uploadingCert, setUploadingCert] = useState(false);
  const [uploadingPan, setUploadingPan] = useState(false);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingNgo, setExistingNgo] = useState(null);
  const [checkingNgo, setCheckingNgo] = useState(!!user);

  useEffect(() => {
    if (!user) {
      return;
    }
    let active = true;
    const checkNgoStatus = async () => {
      try {
        const res = await api.get('/aahar/ngo-food-requests/ngo-status');
        if (active && res.data?.ngo) {
          setExistingNgo(res.data.ngo);
        }
      } catch (err) {
        console.error("Error checking NGO status", err);
      } finally {
        if (active) setCheckingNgo(false);
      }
    };
    checkNgoStatus();
    return () => { active = false; };
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  // Upload a single document file immediately on selection
  const handleFileSelect = async (fieldName, fileOrClear) => {
    if (!fileOrClear) {
      // Clear
      if (fieldName === 'certificationOfRegistration') { setCertFile(null); setCertUrl(''); }
      if (fieldName === 'ownerPanCard') { setPanFile(null); setPanUrl(''); }
      return;
    }

    const file = fileOrClear;
    if (file.size > 5 * 1024 * 1024) {
      showToast('File too large. Max 5 MB allowed.', 'error');
      return;
    }

    const isCert = fieldName === 'certificationOfRegistration';

    if (isCert) { setCertFile(file); setUploadingCert(true); }
    else { setPanFile(file); setUploadingPan(true); }

    try {
      const formData = new FormData();
      formData.append(fieldName, file);
      const res = await api.post('/aahar/ngo/aahaarNgoDocumentsUpload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.filesUrls?.[fieldName];
      if (url) {
        if (isCert) setCertUrl(url);
        else setPanUrl(url);
        showToast('Document uploaded ✅', 'success');
      } else {
        throw new Error('No URL returned');
      }
    } catch {
      showToast('Upload failed. Please try again.', 'error');
      if (isCert) { setCertFile(null); setCertUrl(''); }
      else { setPanFile(null); setPanUrl(''); }
    } finally {
      if (isCert) setUploadingCert(false);
      else setUploadingPan(false);
    }
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
    if (!form.registrationCertificateNumber.trim()) errs.registrationCertificateNumber = 'Required';
    if (!form.panCardNumber.trim()) errs.panCardNumber = 'Required';
    if (!certUrl) errs.certificationOfRegistration = 'Please upload the Registration Certificate';
    if (!panUrl) errs.ownerPanCard = 'Please upload the PAN Card';
    if (!form.prevousWorkReport.trim()) errs.prevousWorkReport = 'Required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      showToast('Please fix the errors above', 'error');
      return;
    }
    if (uploadingCert || uploadingPan) {
      showToast('Please wait for documents to finish uploading.', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/aahar/ngo/aahaarNgoDetails', {
        ...form,
        certificationOfRegistration: certUrl,
        ownerPanCard: panUrl,
      });
      setSubmitted(true);
      showToast('NGO registration submitted! 🎉 You will be notified after review.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Registration failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── Gating checks ──────────────────────────────────────────────────────────
  if (user && checkingNgo) {
    return (
      <div className="ngo-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner spinner-lg" style={{ marginBottom: 16 }} />
          <p style={{ color: 'var(--text-secondary)' }}>Checking NGO registration status...</p>
        </div>
      </div>
    );
  }

  if (existingNgo) {
    const isApp = existingNgo.isApproved;
    return (
      <div className="ngo-page">
        <div className="ngo-hero">
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="section-tag" style={{
              background: isApp ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)',
              borderColor: isApp ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)',
              color: isApp ? 'var(--color-green)' : 'var(--color-yellow)'
            }}>
              {isApp ? '🏢 Active NGO Representative' : '⏳ Review in Progress'}
            </div>
            <h1 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 800, marginBottom: 12 }}>
              NGO Partner: <span className="gradient-text">{existingNgo.ngoName}</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
              {isApp
                ? "Your organization is registered and verified. You cannot register another NGO."
                : "Your organization registration is currently being reviewed by our admin team."}
            </p>
          </div>
        </div>
        <div className="ngo-form-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh', padding: '0 24px' }}>
          <div className="glass-card" style={{ maxWidth: 500, width: '100%', padding: '40px 32px', textAlign: 'center', border: `1px solid ${isApp ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)'}` }}>
            <div style={{ fontSize: '4.5rem', marginBottom: 20, animation: 'float 3s ease-in-out infinite' }}>
              {isApp ? '🏢' : '⏳'}
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 12 }}>
              {isApp ? 'Already Registered' : 'Registration Pending'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 28 }}>
              {isApp
                ? `You have already registered an approved NGO: "${existingNgo.ngoName}". As an NGO Representative, you can manage food requests in the NGO Portal.`
                : `Your registration for "${existingNgo.ngoName}" is pending admin approval. We verify all documents within 2-3 business days.`}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <Link to="/" className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Go Home</Link>
              {isApp && (
                <Link to="/ngo-dashboard" className="btn-primary" style={{ flex: 2, justifyContent: 'center', background: 'linear-gradient(135deg,#06b6d4,#0284c7)' }}>
                  NGO Portal →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <Link to="/login" className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'linear-gradient(135deg,#06b6d4,#0284c7)' }}>Sign In</Link>
              <Link to="/register" className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Create Account</Link>
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
          </div>
        </div>
        <div className="ngo-form-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', padding: '0 24px' }}>
          <div className="glass-card" style={{ maxWidth: 500, width: '100%', padding: '40px 32px', textAlign: 'center', border: '1px solid rgba(234,179,8,0.15)' }}>
            <div style={{ fontSize: '4.5rem', marginBottom: 20, animation: 'float 3s ease-in-out infinite' }}>🛡️</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 12 }}>Aadhaar Verification Required</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: 28 }}>
              {user.adharVerificationDocument ? (
                <span>Your Aadhaar card has been uploaded and is currently <strong>pending admin approval</strong>. Once verified, you will be able to register your NGO.</span>
              ) : (
                <span>To register an NGO, please upload your Aadhaar card on your <strong>Dashboard</strong>. Once approved, this page will unlock.</span>
              )}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <Link to="/" className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</Link>
              <Link to="/dashboard" className="btn-primary" style={{ flex: 2, justifyContent: 'center', background: 'linear-gradient(135deg,#06b6d4,#0284c7)' }}>Go to Dashboard →</Link>
            </div>
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
            Our admin team will verify your documents and notify you within 2–3 business days.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/" className="btn-primary" style={{ padding: '12px 28px' }}>🏠 Go Home</Link>
            <Link to="/ngo-dashboard" className="btn-secondary" style={{ padding: '12px 28px' }}>NGO Portal →</Link>
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

          {/* ── 1. NGO Information ── */}
          <div className="form-card" style={{ marginBottom: 20, animation: 'fadeInUp 0.4s ease both' }}>
            <div style={{ marginBottom: 20 }}>
              <div className="form-card__title">🏢 NGO Information</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tell us about your organization</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { name: 'ngoName', label: 'NGO Name', placeholder: 'e.g. Helping Hands Foundation', required: true },
                { name: 'ngoEmail', label: 'Official Email', type: 'email', placeholder: 'ngo@example.org', required: true },
                { name: 'ngoPhone', label: 'Phone Number', type: 'tel', placeholder: '10-digit mobile number', required: true },
                { name: 'ngoWebsite', label: 'NGO Website', type: 'url', placeholder: 'https://your-ngo.org', required: true },
              ].map(field => (
                <div key={field.name} className="form-group">
                  <label className="form-label">{field.label} {field.required && <span style={{ color: 'var(--color-red)' }}>*</span>}</label>
                  <input
                    name={field.name} type={field.type || 'text'}
                    className={`form-input ${errors[field.name] ? 'error' : ''}`}
                    placeholder={field.placeholder}
                    value={form[field.name]} onChange={handleChange}
                  />
                  {errors[field.name] && <span className="form-error">⚠ {errors[field.name]}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* ── 2. Location ── */}
          <div className="form-card" style={{ marginBottom: 20, animation: 'fadeInUp 0.4s ease both', animationDelay: '0.1s' }}>
            <div style={{ marginBottom: 20 }}>
              <div className="form-card__title">📍 Location</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Where does your NGO operate?</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Full Address <span style={{ color: 'var(--color-red)' }}>*</span></label>
                <textarea name="ngoAddress" className={`form-input ${errors.ngoAddress ? 'error' : ''}`} placeholder="Street, Area, Landmark" value={form.ngoAddress} onChange={handleChange} rows={3} style={{ resize: 'vertical' }} />
                {errors.ngoAddress && <span className="form-error">⚠ {errors.ngoAddress}</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { name: 'ngoCity', label: 'City', placeholder: 'Mumbai' },
                  { name: 'ngoState', label: 'State', placeholder: 'Maharashtra' },
                ].map(field => (
                  <div key={field.name} className="form-group">
                    <label className="form-label">{field.label} <span style={{ color: 'var(--color-red)' }}>*</span></label>
                    <input name={field.name} className={`form-input ${errors[field.name] ? 'error' : ''}`} placeholder={field.placeholder} value={form[field.name]} onChange={handleChange} />
                    {errors[field.name] && <span className="form-error">⚠ {errors[field.name]}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 3. Mission ── */}
          <div className="form-card" style={{ marginBottom: 20, animation: 'fadeInUp 0.4s ease both', animationDelay: '0.15s' }}>
            <div style={{ marginBottom: 20 }}>
              <div className="form-card__title">🎯 Mission & Purpose</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tell us what your NGO does</div>
            </div>
            <div className="form-group">
              <label className="form-label">NGO Purpose / Mission <span style={{ color: 'var(--color-red)' }}>*</span></label>
              <textarea name="ngoPurpose" className={`form-input ${errors.ngoPurpose ? 'error' : ''}`} placeholder="Describe your work — who do you serve and how do you help?" value={form.ngoPurpose} onChange={handleChange} rows={4} style={{ resize: 'vertical' }} />
              {errors.ngoPurpose && <span className="form-error">⚠ {errors.ngoPurpose}</span>}
            </div>
          </div>

          {/* ── 4. Documents ── */}
          <div className="form-card" style={{ marginBottom: 20, animation: 'fadeInUp 0.4s ease both', animationDelay: '0.2s' }}>
            <div style={{ marginBottom: 20 }}>
              <div className="form-card__title">📄 Legal Documents</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Upload your registration certificate and PAN card for verification</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Registration Certificate Upload */}
              <div style={{ gridColumn: '1 / -1' }}>
                <FileUploadInput
                  label="Registration Certificate"
                  name="certificationOfRegistration"
                  required
                  accept="image/*,.pdf"
                  value={certUrl || (certFile?.name)}
                  onChange={handleFileSelect}
                  uploading={uploadingCert}
                  hint="NGO Darpan / Trust / Society / 12A / 80G Registration Certificate (PDF or image)"
                />
                {errors.certificationOfRegistration && (
                  <span className="form-error">⚠ {errors.certificationOfRegistration}</span>
                )}
              </div>

              {/* Registration Certificate Number */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Registration Certificate Number <span style={{ color: 'var(--color-red)' }}>*</span></label>
                <input
                  name="registrationCertificateNumber"
                  type="text"
                  className={`form-input ${errors.registrationCertificateNumber ? 'error' : ''}`}
                  placeholder="e.g. DARPAN/2023/12345"
                  value={form.registrationCertificateNumber}
                  onChange={handleChange}
                />
                {errors.registrationCertificateNumber && <span className="form-error">⚠ {errors.registrationCertificateNumber}</span>}
              </div>

              {/* PAN Card Upload */}
              <div style={{ gridColumn: '1 / -1' }}>
                <FileUploadInput
                  label="Owner / Director PAN Card"
                  name="ownerPanCard"
                  required
                  accept="image/*,.pdf"
                  value={panUrl || (panFile?.name)}
                  onChange={handleFileSelect}
                  uploading={uploadingPan}
                  hint="Upload a clear scan or photo of the PAN card of the NGO owner or director"
                />
                {errors.ownerPanCard && (
                  <span className="form-error">⚠ {errors.ownerPanCard}</span>
                )}
              </div>

              {/* PAN Card Number */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">PAN Card Number <span style={{ color: 'var(--color-red)' }}>*</span></label>
                <input
                  name="panCardNumber"
                  type="text"
                  className={`form-input ${errors.panCardNumber ? 'error' : ''}`}
                  placeholder="e.g. ABCDE1234F"
                  value={form.panCardNumber}
                  onChange={handleChange}
                />
                {errors.panCardNumber && <span className="form-error">⚠ {errors.panCardNumber}</span>}
              </div>

              {/* Previous Work Summary (text) */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">
                  Previous Work Summary <span style={{ color: 'var(--color-red)' }}>*</span>
                </label>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Brief description of past projects and the impact you've made
                </div>
                <textarea
                  name="prevousWorkReport"
                  className={`form-input ${errors.prevousWorkReport ? 'error' : ''}`}
                  placeholder="e.g. We have served 5,000+ families in Mumbai since 2018 through weekly food drives..."
                  value={form.prevousWorkReport}
                  onChange={handleChange}
                  rows={4}
                  style={{ resize: 'vertical' }}
                />
                {errors.prevousWorkReport && <span className="form-error">⚠ {errors.prevousWorkReport}</span>}
              </div>
            </div>

            {/* Document status summary */}
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.12)', borderRadius: 'var(--radius-md)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{certUrl ? '✅' : '⬜'}</span>
                <span style={{ color: certUrl ? '#4ade80' : 'var(--text-muted)' }}>Registration Certificate</span>
              </div>
              <div style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{panUrl ? '✅' : '⬜'}</span>
                <span style={{ color: panUrl ? '#4ade80' : 'var(--text-muted)' }}>PAN Card</span>
              </div>
            </div>
          </div>

          {/* Terms notice */}
          <div style={{ padding: '16px 20px', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
            <strong style={{ color: 'var(--color-teal)' }}>ℹ️ What happens next?</strong><br />
            After submission, our admin will verify your uploaded documents and approve your NGO within 2–3 business days.
            Once approved, you can log in and submit food requests through the NGO Portal.
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || uploadingCert || uploadingPan}
            style={{ width: '100%', justifyContent: 'center', padding: '15px', fontSize: '1rem', background: 'linear-gradient(135deg,#06b6d4,#0284c7)' }}
          >
            {loading ? <><span className="spinner" /> Submitting…</> : '🚀 Submit NGO Registration'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Already registered? <Link to="/ngo-dashboard" style={{ color: 'var(--color-teal)', fontWeight: 600, textDecoration: 'none' }}>NGO Portal →</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
