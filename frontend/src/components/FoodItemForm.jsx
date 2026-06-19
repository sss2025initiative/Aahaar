const CATEGORIES = ['Fruits', 'Vegetables', 'Bakery', 'Dairy', 'Cooked Meals', 'Beverages', 'Packaged Food', 'Grains', 'Others'];
const QTY_TYPES = ['kg', 'g', 'ml', 'l', 'pcs'];

export default function FoodItemForm({ index, item, onChange, onRemove, showRemove }) {
  const handleChange = (field, val) => {
    onChange(index, { ...item, [field]: val });
  };

  return (
    <div className="food-item-form">
      <div className="food-item-form__header">
        <span className="food-item-form__number">Item #{index + 1}</span>
        {showRemove && (
          <button type="button" className="food-item-form__remove" onClick={() => onRemove(index)}>
            ✕ Remove
          </button>
        )}
      </div>

      <div className="food-item-form__grid">
        <div className="form-group">
          <label className="form-label">Food Name *</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. Biryani, Apples..."
            value={item.foodName || ''}
            onChange={(e) => handleChange('foodName', e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Category *</label>
          <select
            className="form-input"
            value={item.category || ''}
            onChange={(e) => handleChange('category', e.target.value)}
            required
          >
            <option value="">Select category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Quantity *</label>
          <input
            className="form-input"
            type="number"
            min="0.1"
            step="0.1"
            placeholder="e.g. 5"
            value={item.quantity || ''}
            onChange={(e) => handleChange('quantity', e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Quantity Type *</label>
          <select
            className="form-input"
            value={item.quantityType || ''}
            onChange={(e) => handleChange('quantityType', e.target.value)}
            required
          >
            <option value="">Select unit</option>
            {QTY_TYPES.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Expiry Date *</label>
          <input
            className="form-input"
            type="date"
            value={item.expiryDate || ''}
            onChange={(e) => handleChange('expiryDate', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Packaging</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. Sealed box, Open tray..."
            value={item.packaging || ''}
            onChange={(e) => handleChange('packaging', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
