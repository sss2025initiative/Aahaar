const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    className: 'badge-pending',
    dot: true,
  },
  pendingngoacceptance: {
    label: 'Pending NGO Acceptance',
    className: 'badge-pending',
    dot: true,
  },
  ngoaccepted: {
    label: 'NGO Accepted',
    className: 'badge-approved',
    dot: false,
  },
  requestaccepted: {
    label: 'Request Accepted',
    className: 'badge-approved',
    dot: false,
  },
  pickupinprogress: {
    label: 'Pickup In Progress',
    className: 'badge-inreview',
    dot: true,
  },
  verified: {
    label: 'Verified',
    className: 'badge-approved',
    dot: false,
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
  done: {
    label: 'Completed',
    className: 'badge-done',
    dot: false,
  },
  completed: {
    label: 'Completed',
    className: 'badge-done',
    dot: false,
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
