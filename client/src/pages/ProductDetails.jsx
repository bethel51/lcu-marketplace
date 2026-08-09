import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useCart } from '../context/CartContext';
import { API_URL } from '../config';
import { VerifiedBadge } from '../components/ProductCard';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const { addToCart, removeFromCart, isInCart } = useCart();
  
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

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Review form state
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');

  // Wishlist / Report state
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [hasReported, setHasReported] = useState(false);

  const sellerObj = (product?.seller && typeof product.seller === 'object') ? product.seller : {};
  const sellerId  = sellerObj._id || product?.seller;
  const isOwnListing = user && (user._id === sellerId || user.id === sellerId);

  const averageRating = sellerObj.ratings?.length > 0
    ? (sellerObj.ratings.reduce((acc, curr) => acc + curr.rating, 0) / sellerObj.ratings.length).toFixed(1)
    : null;

  const fetchProduct = async () => {
    try {
      const response = await fetch(`${API_URL}/api/products/${id}`);
      const data = await response.json();
      if (response.ok) {
        setProduct(data);
        
        // Track view count for analytics
        fetch(`${API_URL}/api/products/${id}/view`, { method: 'POST' }).catch(err => console.error(err));

        // Check if current user reported
        if (user && data.reports?.includes(user._id)) {
          setHasReported(true);
        }
      } else {
        setError(data.message || 'Failed to load product details');
      }
    } catch (err) {
      setError('Connection error occurred while fetching product');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        // Set if this product is in user wishlist
        const inWishlist = data.wishlist?.some(item => item._id === id);
        setIsWishlisted(inWishlist);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProduct();
    if (token) fetchUserProfile();
  }, [id, token]);

  useEffect(() => {
    const mainEl = document.querySelector('.has-bottom-nav');
    if (mainEl) {
      mainEl.style.paddingBottom = '0px';
    }
    return () => {
      if (mainEl) {
        mainEl.style.paddingBottom = '';
      }
    };
  }, []);

  const handleWishlist = async () => {
    if (!token) {
      navigate('/auth', { state: { from: `/product/${id}` } });
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/products/${id}/wishlist`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setIsWishlisted(data.isWishlisted);
        showToast(data.isWishlisted ? 'Saved to your Bag! 👜' : 'Removed from your Bag', 'success');
      }
    } catch (err) {
      showToast('Error updating Bag', 'error');
    }
  };

  const handleReport = async () => {
    if (!token) {
      navigate('/auth', { state: { from: `/product/${id}` } });
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/products/${id}/report`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setHasReported(true);
        showToast('Listing reported successfully. Admin review is pending. ⚠️', 'warning');
      } else {
        showToast(data.message || 'Failed to report listing', 'error');
      }
    } catch (err) {
      showToast('Error reporting listing', 'error');
    }
  };

  const handleDeleteListing = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this listing?')) return;
    try {
      const response = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        showToast('Listing deleted successfully! 🗑️', 'success');
        navigate('/profile');
      } else {
        showToast(data.message || 'Failed to delete listing', 'error');
      }
    } catch (err) {
      showToast('Error deleting listing', 'error');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      navigate('/auth', { state: { from: `/product/${id}` } });
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/auth/rate/${sellerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating, review: reviewText })
      });
      
      const data = await response.json();
      if (response.ok) {
        showToast('Seller review updated successfully! ★', 'success');
        setReviewText('');
        // Reload details to fetch fresh reviews
        fetchProduct();
      } else {
        showToast(data.message || 'Failed to submit review', 'error');
      }
    } catch (err) {
      showToast('Error submitting review', 'error');
    }
  };

  // Pickup Modal & Contact State
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickupDate, setPickupDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [pickupTime, setPickupTime] = useState('04:00 PM - 06:00 PM');
  const [meetingPoint, setMeetingPoint] = useState('LCU Senate Building Car Park');
  const [buyerNote, setBuyerNote] = useState('');

  const LCU_MEETING_POINTS = [
    'LCU Senate Building Car Park',
    'LCU Student Center / Cafeteria',
    'Bronze Hostel Security Gate',
    'Silver Hostel Security Gate',
    'Gold Hostel Security Gate',
    'Platinum Hostel Lounge',
    'Jasper Hall Security Post',
    'Emerald Hall Common Area',
    'Pearl Hall Main Entrance',
    'Sapphire Hall Gate',
    'Off-Campus Location'
  ];

  const PICKUP_TIME_SLOTS = [
    '09:00 AM - 11:00 AM',
    '11:00 AM - 01:00 PM',
    '01:00 PM - 03:00 PM',
    '03:00 PM - 05:00 PM',
    '05:00 PM - 07:00 PM',
    '07:00 PM - 09:00 PM'
  ];

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutOrderId, setCheckoutOrderId] = useState('');
  const [checkoutAmount, setCheckoutAmount] = useState(0);

  const handleOpenPickupModal = () => {
    if (!token) {
      navigate('/auth', { state: { from: `/product/${id}` } });
      return;
    }
    setShowPickupModal(true);
  };

  const handleBuyNowWithPickup = async (e) => {
    e.preventDefault();
    if (!token) return;

    try {
      setShowPickupModal(false);
      const response = await fetch(`${API_URL}/api/payments/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderType: 'escrow',
          productId: product._id,
          pickupDate,
          pickupTime,
          meetingPoint,
          buyerNote
        })
      });
      
      const resData = await response.json();
      if (!response.ok) {
        showToast(resData.message || 'Initialization failed', 'error');
        return;
      }
      
      const { order, amount } = resData;
      setShowPickupModal(false);
      navigate(`/checkout/${order._id}?amount=${amount}&type=buy`);
      
    } catch {
      showToast('Error preparing payment checkout', 'error');
    }
  };

  const handleWhatsAppContact = () => {
    if (!sellerObj.phoneNumber) {
      showToast('Seller phone number is not available', 'error');
      return;
    }
    // Track enquiry for analytics
    if (token) {
      fetch(`${API_URL}/api/products/${id}/enquiry`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(err => console.error(err));
    }
    let rawPhone = sellerObj.phoneNumber.trim().replace(/\D/g, '');
    if (rawPhone.startsWith('0')) rawPhone = '234' + rawPhone.slice(1);
    const text = encodeURIComponent(`Hi ${sellerObj.name || 'Seller'}, I'm interested in buying your "${product.name}" listed for ₦${product.price?.toLocaleString()} on LCU Marketplace.`);
    window.open(`https://wa.me/${rawPhone}?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div style={styles.center} className="container">
        <p>Loading listing details...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={styles.center} className="container">
        <p style={{ color: 'var(--error)' }}>{error || 'Listing not found'}</p>
        <Link to="/" className="btn-secondary" style={{ marginTop: '16px' }}>Back to Marketplace</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', background: 'var(--bg-dark)', minHeight: '100vh', position: 'relative', paddingBottom: '90px' }}>
      
      {/* ── Top Header Image Wrapper ── */}
      <div style={{ position: 'relative', width: '100%', height: 'calc(360px + env(safe-area-inset-top, 0px))', background: '#f5f5f7' }}>
        {/* Back button */}
        <button 
          onClick={() => navigate(-1)} 
          style={{ 
            position: 'absolute', top: 'calc(16px + env(safe-area-inset-top, 0px))', left: '16px', zIndex: 10,
            width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <span style={{ fontSize: '1.1rem', color: '#1d1d1f', fontWeight: 'bold' }}>&lt;</span>
        </button>

        {/* Favorite button */}
        <button 
          onClick={handleWishlist} 
          style={{ 
            position: 'absolute', top: 'calc(16px + env(safe-area-inset-top, 0px))', right: '16px', zIndex: 10,
            width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <span style={{ fontSize: '1.2rem', color: isWishlisted ? 'red' : '#1d1d1f' }}>
            {isWishlisted ? '❤️' : '♡'}
          </span>
        </button>

        {/* Main Product Image */}
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name} 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', fontSize: '3rem' }}>
            🖼️
          </div>
        )}

        {/* Mock Carousel Dots */}
        <div style={{ position: 'absolute', bottom: '16px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--gold)' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(0,0,0,0.1)' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(0,0,0,0.1)' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(0,0,0,0.1)' }} />
        </div>
      </div>

      {/* ── Product Info Panel ── */}
      <div style={{ padding: '24px 20px', background: 'var(--bg-card)', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', marginTop: '-20px', position: 'relative', zIndex: 5 }}>
        
        {/* Title */}
        <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
          {product.name}
        </h1>

        {/* Price */}
        <div style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--gold)', marginBottom: '16px' }}>
          ₦{product.price?.toLocaleString()}
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', padding: '5px 12px', borderRadius: '20px' }}>
            {product.condition || 'Used - Like New'}
          </span>
          <span style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', padding: '5px 12px', borderRadius: '20px' }}>
            {product.category}
          </span>
        </div>

        {/* Seller Info Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: '800', color: '#fff' }}>
              {(sellerObj.name || 'S').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>{sellerObj.name || 'LCU Seller'}</span>
                {sellerObj.isVerifiedStudent && <VerifiedBadge size="sm" />}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span>LCU Student</span>
                <span>•</span>
                <span>⭐ {averageRating || '4.8'} ({sellerObj.ratings?.length || '23'})</span>
              </div>
            </div>
          </div>
          {sellerObj.phoneNumber && (
            <button 
              onClick={handleWhatsAppContact} 
              style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', 
                border: '1px solid var(--gold)', background: 'transparent', color: 'var(--gold)', 
                fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' 
              }}
            >
              💬 Chat
            </button>
          )}
        </div>

        {/* Description Section */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Description
          </h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
            {product.description || 'No description provided by the seller.'}
          </p>
        </div>

        {/* Location Section */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Location
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              {product.hostelLocation || 'Lead City Hostels'}, Lead City University
            </span>
            <button 
              onClick={() => showToast('Coming soon', 'info')}
              style={{ border: 'none', background: 'transparent', color: 'var(--gold)', fontSize: '0.8rem', fontWeight: '700', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
            >
              View on map
            </button>
          </div>
        </div>

      </div>

      {/* ── Sticky Bottom Action Bar ── */}
      <div style={{ position: 'sticky', bottom: 0, width: '100%', background: 'var(--bg-nav)', borderTop: '1px solid var(--border-color)', padding: '16px 20px calc(16px + env(safe-area-inset-bottom, 0px)) 20px', display: 'flex', gap: '12px', zIndex: 100, boxSizing: 'border-box', marginTop: '30px' }}>
        {user?.role !== 'Buyer' ? (
          <div style={{ width: '100%', color: 'var(--gold)', fontSize: '0.86rem', fontWeight: '600', padding: '8px 0', textAlign: 'center' }}>
            🔒 Seller accounts cannot purchase or add products to bag.
          </div>
        ) : (
          <>
            {product && product.status !== 'Sold' && (
              <button 
                onClick={() => {
                  if (isInCart(product._id)) {
                    removeFromCart(product._id);
                    showToast('Removed from Bag', 'info');
                  } else {
                    addToCart(product);
                    showToast('Added to Bag!', 'success');
                  }
                }} 
                style={{ 
                  flex: 1, padding: '14px', borderRadius: '10px', 
                  border: isInCart(product._id) ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)', 
                  background: isInCart(product._id) ? 'rgba(239, 68, 68, 0.15)' : 'transparent', 
                  color: isInCart(product._id) ? 'var(--error)' : 'var(--text-primary)', 
                  fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer' 
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center', width: '100%' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  {isInCart(product._id) ? 'Remove' : 'Add to Bag'}
                </span>
              </button>
            )}
            {product.status === 'Sold' ? (
              <button 
                disabled 
                style={{ 
                  flex: 1, padding: '14px', borderRadius: '10px', border: 'none', 
                  background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '700' 
                }}
              >
                Sold Out
              </button>
            ) : (
              <button 
                onClick={handleOpenPickupModal} 
                style={{ 
                  flex: 1, padding: '14px', borderRadius: '10px', border: 'none', 
                  background: 'var(--gold)', color: '#fff', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.2)'
                }}
              >
                Buy Now
              </button>
            )}
          </>
        )}
      </div>

      {/* Campus Pickup Scheduler Modal */}
      {showPickupModal && (
        <div className="profile-modal-overlay" onClick={() => setShowPickupModal(false)}>
          <div className="profile-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="profile-modal-header">
              <h3 className="profile-modal-title">🤝 Schedule Campus Pickup</h3>
              <button className="profile-modal-close" onClick={() => setShowPickupModal(false)}>✕</button>
            </div>

            <form onSubmit={handleBuyNowWithPickup} className="profile-modal-body" style={{ gap: '16px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '10px', padding: '14px 16px', fontSize: '0.85rem' }}>
                <p style={{ fontWeight: '700', color: 'var(--gold)', marginBottom: '4px' }}>🛡️ Escrow Buyer Protection</p>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Your <strong>₦{product.price?.toLocaleString()}</strong> payment will be held safely in escrow. Funds are only released to <strong>{sellerObj.name || 'the seller'}</strong> after you inspect and accept the item at your meeting point.
                </p>
              </div>

              <div className="dash-settings-field">
                <label className="dash-settings-label">📍 Hostel / Campus Meeting Point</label>
                <select value={meetingPoint} onChange={e => setMeetingPoint(e.target.value)} className="glass-input" required>
                  {LCU_MEETING_POINTS.map(mp => (
                    <option key={mp} value={mp} style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                      {mp}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="dash-settings-field">
                  <label className="dash-settings-label">📅 Pickup Date</label>
                  <input
                    type="date"
                    required
                    value={pickupDate}
                    onChange={e => setPickupDate(e.target.value)}
                    className="glass-input"
                  />
                </div>
                <div className="dash-settings-field">
                  <label className="dash-settings-label">⏰ Preferred Time Slot</label>
                  <select value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="glass-input" required>
                    {PICKUP_TIME_SLOTS.map(ts => (
                      <option key={ts} value={ts} style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                        {ts}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="dash-settings-field">
                <label className="dash-settings-label">📝 Buyer Note / Instructions (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., I'll be wearing a blue hoodie at the gate..."
                  value={buyerNote}
                  onChange={e => setBuyerNote(e.target.value)}
                  className="glass-input"
                />
              </div>

              <div className="profile-modal-footer" style={{ marginTop: '10px' }}>
                <button type="button" onClick={() => setShowPickupModal(false)} className="btn-secondary" style={{ padding: '10px 18px', fontSize: '0.85rem' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '10px 22px', fontSize: '0.85rem' }}>
                  💳 Proceed to Escrow (₦{product.price?.toLocaleString()})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}

const styles = {
  container: {
    paddingTop: '32px',
    paddingBottom: '60px',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-gray)',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    marginBottom: '20px',
    transition: 'var(--transition-smooth)',
  },
  center: {
    height: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1.6fr 1fr',
    gap: '32px',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    }
  },
  imageCard: {
    height: '420px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '1px solid var(--border-color)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  placeholderImg: {
    color: 'var(--text-gray)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  descriptionBox: {
    marginTop: '24px',
    padding: '30px',
    border: '1px solid var(--border-color)',
  },
  sectionTitle: {
    fontSize: '1.2rem',
    marginBottom: '16px',
    color: 'var(--gold)',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '8px',
  },
  descriptionText: {
    lineHeight: '1.6',
    color: 'var(--text-primary)',
    whiteSpace: 'pre-line',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  actionCard: {
    padding: '30px',
    border: '1px solid var(--border-color)',
  },
  warningAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid var(--error)',
    color: 'var(--error)',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    marginBottom: '16px',
    fontWeight: '600',
    lineHeight: '1.45',
    textAlign: 'left',
  },
  categoryBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    color: 'var(--gold)',
    border: '1px solid rgba(212, 175, 55, 0.3)',
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '100px',
    display: 'inline-block',
    marginBottom: '12px',
  },
  name: {
    fontSize: '2rem',
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  price: {
    fontSize: '2.2rem',
    color: 'var(--gold)',
    fontWeight: '800',
    marginBottom: '24px',
  },
  detailsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '20px',
    marginBottom: '24px',
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
  },
  detailLabel: {
    color: 'var(--text-gray)',
  },
  detailValue: {
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  actionsGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  chatBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '1.05rem',
  },
  subActions: {
    display: 'flex',
    gap: '12px',
  },
  actionBtn: {
    flex: 1,
    padding: '10px',
    fontSize: '0.8rem',
    textAlign: 'center',
    cursor: 'pointer',
  },
  reportFeedback: {
    fontSize: '0.8rem',
    color: 'var(--gold)',
    textAlign: 'center',
    marginTop: '4px',
  },
  ownListingBadge: {
    backgroundColor: 'rgba(29, 78, 216, 0.15)',
    color: 'rgba(156, 163, 175, 1)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '12px',
    fontSize: '0.85rem',
    textAlign: 'center',
    fontWeight: '500',
  },
  soldBadgeBig: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: 'var(--error)',
    border: '1px solid var(--error)',
    borderRadius: '6px',
    padding: '12px',
    fontSize: '0.9rem',
    textAlign: 'center',
    fontWeight: '600',
  },
  sellerCard: {
    padding: '30px',
    border: '1px solid var(--border-color)',
  },
  sellerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px',
  },
  sellerAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-blue)',
    border: '2px solid var(--gold)',
    color: 'var(--gold)',
    fontSize: '1.4rem',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sellerName: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  verifiedBadge: {
    fontSize: '0.65rem',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: 'var(--success)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '4px',
    padding: '2px 6px',
    fontWeight: '600',
  },
  sellerMeta: {
    fontSize: '0.8rem',
    color: 'var(--text-gray)',
  },
  ratingsSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  ratingStar: {
    color: 'var(--gold)',
  },
  ratingStars: {
    color: 'var(--gold)',
    fontSize: '1.1rem',
    letterSpacing: '2px',
  },
  ratingNumber: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  ratingCount: {
    fontSize: '0.8rem',
    color: 'var(--text-gray)',
  },
  reviewsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '16px',
  },
  reviewItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    padding: '12px',
    borderRadius: '6px',
  },
  reviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  reviewerName: {
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  reviewStars: {
    color: 'var(--gold)',
    fontSize: '0.8rem',
  },
  reviewText: {
    fontSize: '0.8rem',
    color: 'var(--text-gray)',
    lineHeight: '1.4',
  },
  reviewForm: {
    borderTop: '1px solid var(--border-color)',
    paddingTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  reviewFormTitle: {
    fontSize: '0.95rem',
    color: 'var(--text-primary)',
    fontWeight: '600',
  },
  ratingSelectContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  starSelection: {
    display: 'flex',
    gap: '6px',
  },
  interactiveStar: {
    fontSize: '1.4rem',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
    userSelect: 'none',
  },
  ratingTextDescription: {
    fontSize: '0.8rem',
    color: 'var(--gold)',
    fontWeight: '600',
    marginLeft: '8px',
  },
  reviewLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-gray)',
    fontWeight: '500',
  },
  submitReviewBtn: {
    padding: '8px',
    fontSize: '0.85rem',
  },
  reviewFeedback: {
    fontSize: '0.8rem',
    color: 'var(--gold)',
    textAlign: 'center',
  }
};
