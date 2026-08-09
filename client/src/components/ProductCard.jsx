import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const ProductCard = React.memo(function ProductCard({ product }) {
  const { _id, name, price, originalPrice, image, images, category, hostelLocation, seller, status, productStatus, isBoosted, isFeatured, condition } = product;
  const { user } = useAuth();
  const { addToCart, removeFromCart, isInCart } = useCart();
  const navigate = useNavigate();
  
  const isSameHostel = user?.hostel && hostelLocation && user.hostel.toLowerCase().trim() === hostelLocation.toLowerCase().trim();
  const inCart = isInCart(_id);

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

  const handleCardClick = (e) => {
    if (e.target.closest('button') || e.target.closest('a')) {
      return;
    }
    navigate(`/product/${_id}`);
  };

  // Calculate discount
  const showDiscount = originalPrice && originalPrice > price;
  const discountPct = showDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  
  const pStatus = productStatus || status || 'Available';
  const displayImage = images && images.length > 0 ? images[0] : image;

  return (
    <div 
      className={`premium-card animate-fade-in${isBoosted ? ' boosted-card' : ''}`} 
      onClick={handleCardClick}
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}
    >
      {/* Floating Badges */}
      <div style={styles.badgeContainer}>
        <span style={styles.categoryBadge}>{getCategoryEmoji(category)} {category}</span>
        {isSameHostel && <span style={styles.hostelBadge}>🏠 Same Hostel</span>}
        {pStatus === 'Sold' && <span style={styles.soldBadge}>SOLD</span>}
        {pStatus === 'Reserved' && <span style={styles.reservedBadge}>RESERVED</span>}
        {isBoosted && <span className="boost-badge">🔥 BOOSTED</span>}
        {seller?.isPro && <span className="pro-seller-badge-card">⭐ PRO SELLER</span>}
      </div>

      {/* Image Container with Gradient Overlay */}
      <div className="premium-card-img-container">
        {displayImage ? (
          <>
            <img
              src={displayImage}
              alt={name}
              className="premium-card-img"
              decoding="async"
              loading="lazy"
            />
            <div className="premium-card-img-overlay" />
            {images && images.length > 1 && (
              <div className="card-images-indicator">
                {images.map((_, i) => (
                  <span key={i} className={`indicator-dot${i === 0 ? ' active' : ''}`} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={styles.placeholderImg}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span style={{ fontSize: '0.78rem', marginTop: '6px', fontWeight: '600' }}>No Image</span>
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="premium-card-info" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <div className="premium-card-price-row">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {showDiscount ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="premium-card-price main-sale-price">₦{price.toLocaleString()}</span>
                <span className="premium-card-original-strike">₦{originalPrice.toLocaleString()}</span>
                <span className="discount-pct-badge">{discountPct}% OFF</span>
              </div>
            ) : (
              <span className="premium-card-price">₦{price.toLocaleString()}</span>
            )}
          </div>
          {seller?.isVerifiedStudent && <VerifiedBadge />}
        </div>

        <h3 className="premium-card-title" title={name}>{name}</h3>
        {condition && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-gray)', marginBottom: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span>Condition:</span>
            <span className={`condition-tag condition-${condition.toLowerCase().replace(' ', '-')}`}>{condition}</span>
          </div>
        )}

        <div style={{ marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>📍 {hostelLocation}</span>
          </div>
          <div className="premium-card-footer" style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <button 
              onClick={() => navigate(`/product/${_id}`)} 
              className="btn-secondary" 
              style={{ flex: 1, padding: '10px', fontSize: '0.8rem', fontWeight: '600' }}
            >
              Details
            </button>
            {status !== 'Sold' && (!user || user.role === 'Buyer') && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (inCart) {
                    removeFromCart(_id);
                  } else {
                    addToCart(product);
                  }
                }} 
                className={inCart ? "btn-secondary" : "btn-primary"}
                style={{ 
                  flex: 1, 
                  padding: '10px', 
                  fontSize: '0.8rem', 
                  fontWeight: '700',
                  background: inCart ? 'rgba(239, 68, 68, 0.15)' : 'var(--gold)',
                  color: inCart ? 'var(--error)' : '#fff',
                  border: inCart ? '1px solid rgba(239, 68, 68, 0.3)' : 'none'
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  {inCart ? 'Remove' : 'Add to Bag'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ProductCard;

/* ── Premium LCU Verified Badge ─────────────────────────────── */
export function VerifiedBadge({ size = 'sm' }) {
  const isLg = size === 'lg';
  return (
    <span style={{
      display:        'inline-flex',
      alignItems:     'center',
      gap:            isLg ? '6px' : '4px',
      padding:        isLg ? '5px 12px' : '3px 8px',
      borderRadius:   '6px',
      background:     'rgba(59, 130, 246, 0.12)', // Subtle translucent blue
      border:         '1px solid rgba(59, 130, 246, 0.25)',
      fontSize:       isLg ? '0.78rem' : '0.66rem',
      fontWeight:     '700',
      color:          '#60a5fa', // Crisp clean blue
      whiteSpace:     'nowrap',
      letterSpacing:  '0.02em',
      textTransform:  'uppercase',
    }}
    title="Verified LCU Student"
    >
      <svg
        width={isLg ? 13 : 10}
        height={isLg ? 13 : 10}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#60a5fa"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
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
  reservedBadge: {
    background:   'rgba(245, 158, 11, 0.9)',
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
