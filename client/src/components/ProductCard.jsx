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
    <div style={styles.card} className="glass-panel animate-fade-in">
      {/* Category & Status Badges */}
      <div style={styles.badgeContainer}>
        <span style={styles.categoryBadge}>{getCategoryEmoji(category)} {category}</span>
        {status === 'Sold' && <span style={styles.soldBadge}>SOLD</span>}
      </div>

      {/* Image container */}
      <div style={styles.imgContainer}>
        {image ? (
          <img src={image} alt={name} style={styles.image} />
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
      <div style={styles.info}>
        <div style={styles.priceRow}>
          <span style={styles.price}>₦{price.toLocaleString()}</span>
          {seller?.isVerifiedStudent && (
            <span style={styles.verifiedBadge} title="Verified LCU Student">
              ✓ LCU Verified
            </span>
          )}
        </div>
        
        <h3 style={styles.title}>{name}</h3>
        
        <div style={styles.footer}>
          <span style={styles.location}>
            📍 {hostelLocation}
          </span>
          <Link to={`/product/${_id}`} className="btn-secondary" style={styles.viewBtn}>
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    transition: 'var(--transition-smooth)',
    cursor: 'pointer',
    border: '1px solid var(--border-color)',
  },
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
    color: 'var(--gold)',
    border: '1px solid var(--gold)',
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
  imgContainer: {
    height: '180px',
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottom: '1px solid var(--border-color)',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'var(--transition-smooth)',
  },
  placeholderImg: {
    color: 'var(--text-gray)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  info: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: '12px',
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--gold)',
  },
  verifiedBadge: {
    fontSize: '0.7rem',
    backgroundColor: 'rgba(29, 78, 216, 0.2)',
    color: '#3b82f6',
    border: '1px solid rgba(59, 130, 246, 0.4)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '600',
  },
  title: {
    fontSize: '1rem',
    color: '#fff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontWeight: '500',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '4px',
  },
  location: {
    fontSize: '0.8rem',
    color: 'var(--text-gray)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '120px',
  },
  viewBtn: {
    padding: '6px 12px',
    fontSize: '0.75rem',
    borderRadius: '6px',
  }
};
