import React from 'react';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    className: 'badge-pending',
    dot: true,
  },
  approved: {
    label: 'Approved',
    className: 'badge-approved',
    dot: false,
  },
  rejected: {
    label: 'Rejected',
    className: 'badge-rejected',
    dot: false,
  },
  inreview: {
    label: 'In Review',
    className: 'badge-inreview',
    dot: true,
  },
};

export default function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase().replace(/[^a-z]/g, '');
  const config = STATUS_CONFIG[normalized] || {
    label: status || 'Unknown',
    className: 'badge-pending',
    dot: false,
  };

  return (
    <span className={`badge ${config.className}`}>
      {config.dot && (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'currentColor',
            display: 'inline-block',
            animation: 'pulse-dot 1.4s ease infinite',
            flexShrink: 0,
          }}
        />
      )}
      {config.label}
    </span>
  );
}
