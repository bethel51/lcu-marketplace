import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProductCard({ product }) {
  const { _id, name, price, image, category, hostelLocation, seller, status } = product;
  const { user } = useAuth();
  const isSameHostel = user?.hostel && hostelLocation && user.hostel.toLowerCase().trim() === hostelLocation.toLowerCase().trim();

  const getCategoryEmoji = (cat) => {
    switch (cat) {
      case 'Hostel Items':         return '🏠';
      case 'Gadgets':              return '💻';
      case 'Textbooks & Handouts': return '📚';
      case 'Services':             return '🛠️';
      case 'Others':               return '📦';
      default:                     return '🏷️';
    }
  };

  return (
    <div className="premium-card animate-fade-in">
      {/* Floating Badges */}
      <div style={styles.badgeContainer}>
        <span style={styles.categoryBadge}>{getCategoryEmoji(category)} {category}</span>
        {isSameHostel && <span style={styles.hostelBadge}>🏠 Same Hostel</span>}
        {status === 'Sold' && <span style={styles.soldBadge}>SOLD</span>}
      </div>

      {/* Image */}
      <div className="premium-card-img-container">
        {image ? (
          <img src={image} alt={name} className="premium-card-img" />
        ) : (
          <div style={styles.placeholderImg}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span style={{ fontSize: '0.75rem', marginTop: '6px' }}>No Image</span>
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="premium-card-info">
        <div className="premium-card-price-row">
          <span className="premium-card-price">₦{price.toLocaleString()}</span>
          {seller?.isVerifiedStudent && <VerifiedBadge />}
        </div>

        <h3 className="premium-card-title">{name}</h3>

        <div className="premium-card-footer">
          <span className="premium-card-location">📍 {hostelLocation}</span>
          <Link to={`/product/${_id}`} className="btn-secondary premium-card-btn">
            View →
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Premium LCU Verified Badge ─────────────────────────────── */
export function VerifiedBadge({ size = 'sm' }) {
  const isLg = size === 'lg';
  return (
    <span style={{
      display:        'inline-flex',
      alignItems:     'center',
      gap:            isLg ? '7px' : '5px',
      padding:        isLg ? '6px 14px' : '4px 10px',
      borderRadius:   '999px',
      background:     'linear-gradient(135deg, rgba(12, 35, 64, 0.95) 0%, rgba(29, 78, 216, 0.95) 100%)',
      border:         '1.5px solid #d4af37', // Gold border
      boxShadow:      '0 2px 10px rgba(212, 175, 55, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      fontSize:       isLg ? '0.85rem' : '0.72rem',
      fontWeight:     '700',
      color:          '#f3e5ab', // Soft gold text
      whiteSpace:     'nowrap',
      letterSpacing:  '0.04em',
      textTransform:  'uppercase',
      textShadow:     '0 1px 2px rgba(0,0,0,0.5)',
      fontFamily:     'var(--font-title)',
    }}
    title="Verified Lead City University Student"
    >
      {/* Premium Badge Icon */}
      <svg
        width={isLg ? 15 : 12}
        height={isLg ? 15 : 12}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#d4af37" // Gold icon stroke
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
      LCU Verified
    </span>
  );
}

const styles = {
  badgeContainer: {
    position: 'absolute', top: '10px', left: '10px', zIndex: 2,
    display: 'flex', gap: '6px', flexWrap: 'wrap',
  },
  categoryBadge: {
    background:   'rgba(9, 15, 29, 0.78)',
    backdropFilter: 'blur(8px)',
    color:        '#93c5fd',
    border:       '1px solid rgba(147, 197, 253, 0.3)',
    fontSize:     '0.7rem',
    fontWeight:   '600',
    padding:      '4px 9px',
    borderRadius: '999px',
  },
  hostelBadge: {
    background:   'linear-gradient(135deg, rgba(16, 185, 129, 0.9) 0%, rgba(5, 150, 105, 0.9) 100%)',
    backdropFilter: 'blur(8px)',
    color:        '#fff',
    border:       '1px solid rgba(16, 185, 129, 0.3)',
    fontSize:     '0.7rem',
    fontWeight:   '700',
    padding:      '4px 9px',
    borderRadius: '999px',
    boxShadow:    '0 2px 8px rgba(16, 185, 129, 0.25)',
  },
  soldBadge: {
    background:   'rgba(239, 68, 68, 0.9)',
    backdropFilter: 'blur(8px)',
    color:        '#fff',
    fontSize:     '0.68rem',
    fontWeight:   '800',
    padding:      '4px 9px',
    borderRadius: '999px',
    letterSpacing:'0.05em',
  },
  placeholderImg: {
    color:          'var(--text-muted)',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
  },
};
