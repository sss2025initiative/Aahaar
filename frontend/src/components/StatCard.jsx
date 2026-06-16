import React, { useEffect, useRef, useState } from 'react';

function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }

export default function StatCard({ icon, label, value, gradient, delay = 0, suffix = '' }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          setTimeout(() => {
            setVisible(true);
            animateCounter();
          }, delay);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, delay]);

  const animateCounter = () => {
    const target = typeof value === 'number' ? value : parseFloat(value) || 0;
    const duration = 1800;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuad(progress);
      setDisplayValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  return (
    <div
      ref={ref}
      className="stat-card"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      <div className="stat-card__icon" style={{ background: gradient }}>
        <span>{icon}</span>
      </div>
      <div className="stat-card__body">
        <div className="stat-card__value">
          {displayValue.toLocaleString()}{suffix}
        </div>
        <div className="stat-card__label">{label}</div>
      </div>
      <div className="stat-card__glow" style={{ background: gradient }} />
    </div>
  );
}
