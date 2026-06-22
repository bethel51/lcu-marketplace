import React from 'react';
import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  const { _id, name, price, image, category, hostelLocation, seller, status } = product;

  const getCategoryEmoji = (cat) => {
    switch (cat) {
      case 'Hostel Items': return '🏠';
      case 'Gadgets': return '💻';
      case 'Textbooks & Handouts': return '📚';
      case 'Services': return '🛠️';
      case 'Others': return '📦';
      default: return '🏷️';
    }
  };

  return (
    <div className="premium-card animate-fade-in">
      {/* Category & Status Badges */}
      <div style={styles.badgeContainer}>
        <span style={styles.categoryBadge}>{getCategoryEmoji(category)} {category}</span>
        {status === 'Sold' && <span style={styles.soldBadge}>SOLD</span>}
      </div>

      {/* Image container */}
      <div className="premium-card-img-container">
        {image ? (
          <img src={image} alt={name} className="premium-card-img" />
        ) : (
          <div style={styles.placeholderImg}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span style={{ fontSize: '0.8rem', marginTop: '8px' }}>No Image Provided</span>
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="premium-card-info">
        <div className="premium-card-price-row">
          <span className="premium-card-price">₦{price.toLocaleString()}</span>
          {seller?.isVerifiedStudent && (
            <span style={styles.verifiedBadge} title="Verified LCU Student">
              ✓ LCU Verified
            </span>
          )}
        </div>
        
        <h3 className="premium-card-title">{name}</h3>
        
        <div className="premium-card-footer">
          <span className="premium-card-location">
            📍 {hostelLocation}
          </span>
          <Link to={`/product/${_id}`} className="btn-secondary premium-card-btn">
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  badgeContainer: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    zIndex: 2,
    display: 'flex',
    gap: '6px',
  },
  categoryBadge: {
    backgroundColor: 'rgba(12, 35, 64, 0.85)',
    color: '#90caf9',
    border: '1px solid rgba(144, 202, 249, 0.5)',
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '4px 8px',
    borderRadius: '100px',
  },
  soldBadge: {
    backgroundColor: 'var(--error)',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '4px 8px',
    borderRadius: '100px',
  },
  placeholderImg: {
    color: 'var(--text-gray)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  verifiedBadge: {
    fontSize: '0.7rem',
    backgroundColor: 'rgba(29, 78, 216, 0.15)',
    color: '#60a5fa',
    border: '1px solid rgba(96, 165, 250, 0.3)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '600',
  }
};
