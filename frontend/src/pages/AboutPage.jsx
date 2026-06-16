import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <div className="about-page" style={{ padding: 'calc(var(--navbar-h) + 40px) 0 80px', background: 'var(--grad-hero)', minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: 840 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48, animation: 'fadeInUp 0.6s ease both' }}>
          <span className="section-tag">🌾 About Aahaar</span>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)', fontWeight: 800, marginBottom: 16 }}>
            Bridging Surplus with <span className="gradient-text">Need</span> 🤝
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.7 }}>
            Aahaar is an autonomous community logistics system developed by the <strong>SSS Initiative 2025</strong> to combat food waste and hunger in Indian cities.
          </p>
        </div>

        {/* Mission and Vision */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 48 }}>
          <div className="glass-card" style={{ padding: 32, animation: 'fadeInUp 0.5s ease both', animationDelay: '0.1s' }}>
            <span style={{ fontSize: '2.5rem' }}>🎯</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '16px 0 10px' }}>Our Mission</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              To ensure no consumable food is ever wasted in municipal areas, redirecting surplus meals from events, restaurants, and homes to families and shelters suffering from food insecurity.
            </p>
          </div>
          <div className="glass-card" style={{ padding: 32, animation: 'fadeInUp 0.5s ease both', animationDelay: '0.2s' }}>
            <span style={{ fontSize: '2.5rem' }}>👁️</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '16px 0 10px' }}>Our Vision</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              Building a city-integrated logistics ecosystem where food donors and certified NGOs collaborate transparently, backed by verified tracking, minimal delays, and robust tax exemption structures.
            </p>
          </div>
        </div>

        {/* SSS Initiative Details */}
        <div className="glass-card" style={{ padding: 40, marginBottom: 48, animation: 'fadeInUp 0.5s ease both', animationDelay: '0.3s' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 16 }}>
            The <span className="gradient-text">SSS Initiative</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.8, marginBottom: 20 }}>
            Founded in 2025, the SSS Initiative centers around developing digital infrastructure that helps bridge logistics issues within local communities. By leveraging smart distribution networks, verification portals, and secure user directories, we empower local citizens to take active roles in community upliftment.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
            {[
              { title: '🔒 Trust Verification', desc: 'Secure Aadhaar validation for donors and certificate auditing for NGOs.' },
              { title: '📍 City Integration', desc: 'Auto-allocating pickups matching donors and NGOs inside same urban wards.' },
              { title: '📊 Tax Incentives', desc: 'Generating detailed itemized certificates eligible for tax exemption schemes.' },
            ].map((feature, idx) => (
              <div key={idx} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-orange)', marginBottom: 6 }}>{feature.title}</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Step-by-Step Flow */}
        <div style={{ textAlign: 'center', marginBottom: 40, animation: 'fadeInUp 0.5s ease both', animationDelay: '0.4s' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 24 }}>How Aahaar Works</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
            {[
              { num: '1', title: 'Donor Lists Surplus', body: 'Registered and verified donors fill a simple form listing category, quantity, and expiration date.' },
              { num: '2', title: 'Admin Team Reviews', body: 'Our administrative panel monitors and approves incoming listings to ensure hygiene standards.' },
              { num: '3', title: 'NGO Coordinates Pick Up', body: 'The system selects and notifies certified local NGOs matching their active municipality.' },
              { num: '4', title: 'Impact is Saved', body: 'The pickup is completed, meals are served, and itemized tax details are stored for retrieval.' }
            ].map((step, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 20, alignItems: 'center', padding: '16px 24px', background: 'rgba(17,24,39,0.5)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', color: '#fff', flexShrink: 0 }}>
                  {step.num}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: 2 }}>{step.title}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{step.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', animation: 'fadeInUp 0.5s ease both', animationDelay: '0.5s' }}>
          <Link to="/register" className="btn-primary" style={{ padding: '14px 40px' }}>
            Join the Movement Today 🚀
          </Link>
        </div>
      </div>
    </div>
  );
}
