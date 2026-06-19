import StatusBadge from './StatusBadge';

export default function DonationCard({ donation, onEdit, onDelete }) {
  const { foodItemDetails = [], city, contactPersonName, phoneNumber, status, _id } = donation;

  return (
    <div className="donation-card">
      <div className="donation-card__header">
        <div className="donation-card__meta">
          <span className="donation-card__id">#{String(_id).slice(-8).toUpperCase()}</span>
          <StatusBadge status={status} />
        </div>
        <div className="donation-card__actions">
          {onEdit && (
            <button className="btn-ghost" onClick={() => onEdit(donation)}>
              ✏️ Edit
            </button>
          )}
          {onDelete && (
            <button className="btn-danger" style={{ fontSize: '0.8rem', padding: '6px 14px' }} onClick={() => onDelete(_id)}>
              🗑 Delete
            </button>
          )}
        </div>
      </div>

      <div className="donation-card__items">
        {foodItemDetails.map((item, idx) => (
          <div key={idx} className="food-item-pill">
            <span className="food-item-pill__category">{item.category}</span>
            <span className="food-item-pill__name">{item.foodName}</span>
            <span className="food-item-pill__qty">{item.quantity} {item.quantityType}</span>
          </div>
        ))}
      </div>

      <div className="donation-card__info">
        {contactPersonName && (
          <div className="donation-card__info-item">
            <span className="donation-card__info-icon">👤</span>
            <span>{contactPersonName}</span>
          </div>
        )}
        {phoneNumber && (
          <div className="donation-card__info-item">
            <span className="donation-card__info-icon">📞</span>
            <span>{phoneNumber}</span>
          </div>
        )}
        {city && (
          <div className="donation-card__info-item">
            <span className="donation-card__info-icon">📍</span>
            <span>{city}</span>
          </div>
        )}
      </div>
    </div>
  );
}
