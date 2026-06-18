import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const FOOD_PARTICLES = ['🍎', '🥗', '🍞', '🥛', '🍱', '🥕', '🍇', '🌾', '🥦', '🍊', '🫙', '🍚', '🧅', '🥑', '🍋'];

const STEPS = [
  { step: '01', icon: '📝', title: 'Register & Verify', desc: 'Create your account in minutes. Quick verification keeps our community trustworthy and safe.', color: 'var(--grad-primary)', accent: 'rgba(249,115,22,0.12)' },
  { step: '02', icon: '🍱', title: 'List Surplus Food', desc: 'Add food items with details — type, quantity, expiry. It takes under 2 minutes.', color: 'var(--grad-teal)', accent: 'rgba(6,182,212,0.12)' },
  { step: '03', icon: '🤝', title: 'NGO Collection', desc: 'Verified NGOs in your city review and collect. We coordinate the entire handover process.', color: 'var(--grad-green)', accent: 'rgba(34,197,94,0.12)' },
  { step: '04', icon: '❤️', title: 'Impact Created', desc: 'Your food reaches those in need. Track your entire donation journey from your dashboard.', color: 'var(--grad-purple)', accent: 'rgba(168,85,247,0.12)' },
];

const CATEGORIES = [
  { icon: '🍎', name: 'Fruits', color: '#ef4444' },
  { icon: '🥦', name: 'Vegetables', color: '#22c55e' },
  { icon: '🍞', name: 'Bakery', color: '#f59e0b' },
  { icon: '🥛', name: 'Dairy', color: '#60a5fa' },
  { icon: '🍱', name: 'Cooked Meals', color: '#f97316' },
  { icon: '🧃', name: 'Beverages', color: '#06b6d4' },
  { icon: '🫙', name: 'Packaged Food', color: '#a855f7' },
  { icon: '🌾', name: 'Grains', color: '#fbbf24' },
  { icon: '🥘', name: 'Others', color: '#94a3b8' },
];

const TESTIMONIALS = [
  { name: 'Priya Sharma', role: 'Restaurant Owner, Mumbai', text: "We used to discard so much food every day. Aahaar connected us with 3 NGOs — now nothing goes to waste. It's incredibly rewarding.", avatar: '👩‍🍳', rating: 5 },
  { name: 'Rajesh Kumar', role: 'Event Organizer, Delhi', text: 'After every corporate event, we donate surplus food through Aahaar. The process is seamless and the impact tracking is truly amazing.', avatar: '👨‍💼', rating: 5 },
  { name: 'Meena Iyer', role: 'Home Chef, Bengaluru', text: "Even as an individual, I can donate excess home-cooked meals. Aahaar makes it feel like a community effort, not just a transaction.", avatar: '👩', rating: 5 },
];

const FAQ = [
  { q: 'Who can donate food on Aahaar?', a: 'Anyone — restaurants, event organizers, caterers, home cooks, grocery stores. If you have excess food, we help you donate it.' },
  { q: 'How are NGOs verified?', a: 'Every NGO goes through a document verification process by our admin team before they can accept donations on the platform.' },
  { q: 'Is there a minimum donation amount?', a: 'No minimum. Even a small quantity of food can make a difference. All categories and quantities are welcome.' },
  { q: 'How quickly is a donation collected?', a: 'Once your donation is approved, an NGO in your city is notified and will typically coordinate pickup within 24–48 hours.' },
];

function AnimatedCounter({ target, suffix = '', prefix = '' }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const animated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated.current) {
        animated.current = true;
        const duration = 2200;
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 4);
          setValue(Math.round(eased * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.4 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{prefix}{value.toLocaleString('en-IN')}{suffix}</span>;
}

function StarRating({ count = 5 }) {
  return (
    <div style={{ display: 'flex', gap: 2, marginBottom: 14 }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{ color: '#fbbf24', fontSize: '1rem' }}>★</span>
      ))}
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'border-color 0.2s', borderColor: open ? 'rgba(249,115,22,0.3)' : undefined }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', background: 'rgba(17,24,39,0.6)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', gap: 16, textAlign: 'left' }}
      >
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{q}</span>
        <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: open ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: open ? 'var(--color-orange)' : 'var(--text-muted)', transition: 'all 0.2s', transform: open ? 'rotate(45deg)' : 'none' }}>
          +
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 24px 18px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7, background: 'rgba(249,115,22,0.03)', animation: 'fadeInUp 0.2s ease' }}>
          {a}
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/aahar/stats/getStats')
      .then(res => setStats(res.data?.data || res.data))
      .catch(() => {});
  }, []);

  const totalDonations = stats?.totalDonations || 1280;
  const mealsServed = stats?.mealsServed || totalDonations * 8;
  const ngosCount = stats?.totalNgos || 47;
  const citiesCount = stats?.citiesCount || 23;

  return (
    <div className="landing">
      {/* ─── HERO ─── */}
      <section className="hero">
        {/* Particles */}
        <div className="particles" aria-hidden="true">
          {FOOD_PARTICLES.map((emoji, i) => (
            <span key={i} className="particle" style={{
              left: `${(i * 6.8 + 3) % 96}%`,
              top: `${(i * 11 + 7) % 78}%`,
              fontSize: `${1 + (i % 4) * 0.4}rem`,
              animationDelay: `${i * 0.6}s`,
              animationDuration: `${5 + (i % 5)}s`,
              opacity: 0.1 + (i % 3) * 0.05,
            }}>{emoji}</span>
          ))}
        </div>

        <div className="hero__glow hero__glow--left" />
        <div className="hero__glow hero__glow--right" />

        <div className="container hero__content">
          <div className="hero__tag section-tag" style={{ fontSize: '0.78rem' }}>
            🌾 Fighting Hunger Across India
          </div>

          <h1 className="hero__title">
            Turn Surplus Food Into<br />
            <span className="gradient-text">Hope & Hot Meals</span>
          </h1>

          <p className="hero__subtitle">
            Aahaar is India's food donation bridge — connecting generous donors with verified NGOs
            so that every surplus meal finds someone who truly needs it.
          </p>

          <div className="hero__cta">
            <Link to="/register" className="btn-primary hero__cta-btn" style={{ padding: '15px 36px', fontSize: '1rem' }}>
              Start Donating 🚀
            </Link>
            <Link to="/ngo-register" className="btn-secondary hero__cta-btn" style={{ padding: '14px 32px', fontSize: '1rem' }}>
              Register NGO →
            </Link>
          </div>

          <div className="hero__trust">
            {['✅ 100% Verified NGOs', '🔒 Secure Platform', '📊 Real-time Tracking', '💰 Tax Exemption (80G)', '🆓 Completely Free'].map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>
        </div>

        {/* Hero visual */}
        <div style={{ position: 'absolute', right: '5%', top: '50%', transform: 'translateY(-50%)', width: 340, height: 340, background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: '10rem', animation: 'float 6s ease infinite' }}>🌾</div>
        </div>

        <div className="hero__scroll"><div className="hero__scroll-dot" /></div>
      </section>

      {/* ─── IMPACT STATS ─── */}
      <section className="impact">
        <div className="container">
          <div className="impact__grid">
            {[
              { val: totalDonations, suffix: '+', label: 'Food Donations', icon: '📦', color: 'var(--grad-primary)' },
              { val: mealsServed, suffix: '+', label: 'Meals Served', icon: '🍽️', color: 'var(--grad-primary)' },
              { val: ngosCount, suffix: '+', label: 'NGO Partners', icon: '🤝', color: 'var(--color-teal)' },
              { val: citiesCount, suffix: '+', label: 'Cities Active', icon: '🏙️', color: 'var(--color-green)' },
            ].map((s, i) => (
              <React.Fragment key={i}>
                {i > 0 && <div className="impact__divider" />}
                <div className="impact__stat">
                  <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{s.icon}</div>
                  <div className="impact__stat-value" style={{ background: s.color, WebkitBackgroundClip: 'text', WebkitTextFillColor: s.color !== 'var(--grad-primary)' ? s.color : 'transparent', backgroundClip: 'text' }}>
                    <AnimatedCounter target={s.val} suffix={s.suffix} />
                  </div>
                  <div className="impact__stat-label">{s.label}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CORE PLATFORM CAPABILITIES ─── */}
      <section className="core-offerings" style={{ padding: '80px 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '80%', height: '30%', background: 'radial-gradient(circle, rgba(249,115,22,0.04) 0%, transparent 60%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div className="container">
          <div className="section-header" style={{ marginBottom: 48 }}>
            <div className="section-tag">🌟 Core Offerings</div>
            <h2 className="section-title">One Platform,<br /><span className="gradient-text">Double the Value</span></h2>
            <p className="section-subtitle">Aahaar simplifies surplus food management while optimizing tax benefits for your generosity.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32, marginTop: 20 }}>
            {/* Card 1: Donate Food */}
            <div className="glass-card" style={{ 
              padding: '40px 32px', 
              borderRadius: 'var(--radius-xl)', 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid var(--border-color)', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)';
              e.currentTarget.style.boxShadow = '0 10px 40px rgba(249,115,22,0.06)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.1)';
              e.currentTarget.style.transform = 'none';
            }}>
              <div>
                <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'rgba(249,115,22,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', marginBottom: 24, color: 'var(--color-orange)' }}>
                  🍱
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 14, color: 'var(--text-primary)' }}>
                  Donate Surplus Food
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                  Instantly list excess food from restaurants, weddings, or household kitchens. Our location-smart routing matches you with approved local NGOs to prevent food waste.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--color-orange)' }}>✓</span> 📸 Upload items with categorization tags
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--color-orange)' }}>✓</span> 🔑 Unique QR & alphanumeric pickup tokens
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--color-orange)' }}>✓</span> 📍 Direct coordination with verified NGOs
                  </li>
                </ul>
              </div>
              <Link to="/register" className="btn-primary" style={{ alignSelf: 'flex-start', padding: '12px 28px', fontSize: '0.875rem', border: 'none', color: '#fff' }}>
                Start Donating 🚀
              </Link>
            </div>

            {/* Card 2: Tax Benefit */}
            <div className="glass-card" style={{ 
              padding: '40px 32px', 
              borderRadius: 'var(--radius-xl)', 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid var(--border-color)', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)';
              e.currentTarget.style.boxShadow = '0 10px 40px rgba(6,182,212,0.06)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.1)';
              e.currentTarget.style.transform = 'none';
            }}>
              <div>
                <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', marginBottom: 24, color: 'var(--color-teal)' }}>
                  💰
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 14, color: 'var(--text-primary)' }}>
                  Claim Tax Benefits (80G)
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                  Turn your social responsibility into savings. Every verified donation automatically calculates tax exemption amounts based on item types (up to 40%) and issues 80G-ready tax certificates.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--color-teal)' }}>✓</span> 📊 Automated category valuation index
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--color-teal)' }}>✓</span> 📥 Instant PDF certificate generation
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--color-teal)' }}>✓</span> 🏢 Compliance documents for audits & filing
                  </li>
                </ul>
              </div>
              <Link to="/register" className="btn-secondary" style={{ alignSelf: 'flex-start', padding: '11px 26px', fontSize: '0.875rem' }}>
                Calculate Exemption →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="how-it-works">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">⚙️ Process</div>
            <h2 className="section-title">Simple Steps,<br /><span className="gradient-text">Massive Impact</span></h2>
            <p className="section-subtitle">From signup to feeding someone — in under 5 minutes.</p>
          </div>

          <div className="steps-grid">
            {STEPS.map((step, i) => (
              <div key={i} className="step-card" style={{ animationDelay: `${i * 0.1}s`, background: step.accent }}>
                <div className="step-card__number" style={{ background: step.color }}>{step.step}</div>
                <div className="step-card__icon">{step.icon}</div>
                <h3 className="step-card__title">{step.title}</h3>
                <p className="step-card__desc">{step.desc}</p>
                {i < STEPS.length - 1 && <div className="step-card__arrow">→</div>}
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <Link to="/register" className="btn-primary" style={{ padding: '14px 36px', fontSize: '1rem' }}>
              Get Started Free →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CATEGORIES ─── */}
      <section className="categories">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">🍽️ Categories</div>
            <h2 className="section-title">What Can You <span className="gradient-text">Donate?</span></h2>
            <p className="section-subtitle">We accept almost all kinds of food — fresh, packaged, or cooked.</p>
          </div>
          <div className="categories__grid">
            {CATEGORIES.map((cat, i) => (
              <div key={i} className="category-pill" style={{ animationDelay: `${i * 0.05}s` }}>
                <span style={{ fontSize: '1.4rem' }}>{cat.icon}</span>
                <span style={{ fontWeight: 600 }}>{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHO IS IT FOR ─── */}
      <section style={{ padding: '80px 0' }}>
        <div className="container">
          <div className="section-header">
            <div className="section-tag">👥 For Everyone</div>
            <h2 className="section-title">Built for <span className="gradient-text">All Donors</span></h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { icon: '🍽️', title: 'Restaurants & Hotels', desc: 'End-of-day leftover management. Donate unsold food instead of discarding it.', color: 'var(--grad-primary)' },
              { icon: '🎪', title: 'Event Organizers', desc: 'Post-event surplus food goes to verified NGOs in your city, not the garbage.', color: 'var(--grad-teal)' },
              { icon: '🏠', title: 'Home Cooks', desc: 'Even small quantities of home-cooked or packaged food can make a big difference.', color: 'var(--grad-green)' },
            ].map((card, i) => (
              <div key={i} className="step-card" style={{ textAlign: 'left', animationDelay: `${i * 0.1}s` }}>
                <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', background: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: 20 }}>
                  {card.icon}
                </div>
                <h3 className="step-card__title" style={{ textAlign: 'left' }}>{card.title}</h3>
                <p className="step-card__desc" style={{ textAlign: 'left' }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="testimonials" style={{ background: 'rgba(13,21,48,0.4)' }}>
        <div className="container">
          <div className="section-header">
            <div className="section-tag">💬 Stories</div>
            <h2 className="section-title">Voices from Our <span className="gradient-text">Community</span></h2>
            <p className="section-subtitle">Real stories from real donors making a difference.</p>
          </div>
          <div className="testimonials__grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="testimonial-card">
                <StarRating count={t.rating} />
                <div className="testimonial-card__quote">"</div>
                <p className="testimonial-card__text">{t.text}</p>
                <div className="testimonial-card__author">
                  <span className="testimonial-card__avatar" style={{ fontSize: '2.5rem' }}>{t.avatar}</span>
                  <div>
                    <div className="testimonial-card__name">{t.name}</div>
                    <div className="testimonial-card__role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section style={{ padding: '80px 0' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="section-header">
            <div className="section-tag">❓ FAQ</div>
            <h2 className="section-title">Common <span className="gradient-text">Questions</span></h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FAQ.map((item, i) => <FaqItem key={i} {...item} />)}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="cta-section">
        <div className="cta-section__bg" />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(249,115,22,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(6,182,212,0.05) 0%, transparent 50%)', pointerEvents: 'none' }} />
        <div className="container cta-section__content">
          <div className="section-tag" style={{ marginBottom: 20 }}>🚀 Join Today</div>
          <h2 className="cta-section__title">
            Ready to Make a <span className="gradient-text">Difference?</span>
          </h2>
          <p className="cta-section__subtitle">
            Every meal donated is a step towards an India without hunger.<br />
            It takes less than 2 minutes to get started.
          </p>
          <div className="cta-section__btns">
            <Link to="/register" className="btn-primary" style={{ padding: '16px 44px', fontSize: '1.05rem' }}>
              🌟 Join as Donor
            </Link>
            <Link to="/ngo-register" className="btn-secondary" style={{ padding: '15px 40px', fontSize: '1.05rem' }}>
              Register Your NGO
            </Link>
          </div>
          <div style={{ marginTop: 24, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            100% Free · No credit card required · Immediate access
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="footer">
        <div className="container">
          <div className="footer__top">
            <div className="footer__brand">
              <div className="footer__logo">
                <span>🌾</span>
                <span className="gradient-text" style={{ fontWeight: 800, fontSize: '1.4rem' }}>Aahaar</span>
              </div>
              <p className="footer__tagline">
                Fighting hunger, sharing hope. One meal at a time.<br />
                A platform by the SSS Initiative 2025.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                {['🌐', '📧', '📱'].map((icon, i) => (
                  <div key={i} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    {icon}
                  </div>
                ))}
              </div>
            </div>
            <div className="footer__links-group">
              <h4>Platform</h4>
              <Link to="/register">Donate Food</Link>
              <Link to="/ngo-register">NGO Registration</Link>
              <Link to="/login">Login</Link>
              <Link to="/dashboard">Dashboard</Link>
            </div>
            <div className="footer__links-group">
              <h4>Contact</h4>
              <a href="mailto:sss.initiative.2025@gmail.com">sss.initiative.2025@gmail.com</a>
              <span>India 🇮🇳</span>
              <span style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Available Mon–Fri, 9AM–6PM</span>
            </div>
          </div>
          <div className="footer__bottom">
            <span>© 2025 Aahaar · SSS Initiative. All rights reserved.</span>
            <span>Made with ❤️ to fight hunger in India</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
