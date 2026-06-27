import React from 'react';

function displayValue(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'object') return <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(value, null, 2)}</pre>;
  return String(value);
}

export default function TableDetailModal({ title = 'Details', row, fields, onClose, actions }) {
  if (!row) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 820 }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            {fields.map((field) => (
              <div key={field.key || field.label} className="detail-field">
                <div className="detail-label">{field.label}</div>
                <div className="detail-value">
                  {field.render ? field.render(row) : displayValue(row[field.key])}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn secondary" onClick={onClose}>Cancel</button>
          {actions}
        </div>
      </div>
    </div>
  );
}
