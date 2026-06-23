import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config';
import { VerifiedBadge } from '../components/ProductCard';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { showToast } = useToast();
  
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

  const fetchProduct = async () => {
    try {
      const response = await fetch(`${API_URL}/api/products/${id}`);
      const data = await response.json();
      if (response.ok) {
        setProduct(data);
        
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
        showToast(data.isWishlisted ? 'Item added to Wishlist! 💙' : 'Item removed from Wishlist', 'success');
      }
    } catch (err) {
      showToast('Error modifying wishlist', 'error');
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

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      navigate('/auth', { state: { from: `/product/${id}` } });
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/auth/rate/${product.seller._id}`, {
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

  const handleStartChat = () => {
    if (!token) {
      navigate('/auth', { state: { from: `/product/${id}` } });
      return;
    }
    // Redirect to chat center, passing query parameters to initialize conversation
    navigate(`/chat?contactId=${product.seller._id}&productId=${product._id}`);
  };

  const handleDeleteListing = async () => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/products/${product._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        showToast('Listing deleted successfully!', 'success');
        navigate('/profile');
      }
    } catch (err) {
      showToast('Failed to delete listing', 'error');
    }
  };

  const handleBuyNow = async () => {
    if (!token) {
      navigate('/auth', { state: { from: `/product/${id}` } });
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/payments/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderType: 'escrow',
          productId: product._id
        })
      });
      
      const resData = await response.json();
      if (!response.ok) {
        showToast(resData.message || 'Initialization failed', 'error');
        return;
      }
      
      const { txRef, amount, email, name, phoneNumber, flwPublicKey } = resData;
      
      window.FlutterwaveCheckout({
        public_key: flwPublicKey,
        tx_ref: txRef,
        amount: amount,
        currency: 'NGN',
        payment_options: 'card, banktransfer, ussd',
        customer: {
          email: email,
          phone_number: phoneNumber,
          name: name,
        },
        customizations: {
          title: 'LCU Marketplace Secure Escrow',
          description: `Payment for ${product.name}`,
          logo: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150',
        },
        callback: async (paymentRes) => {
          try {
            const verifyResponse = await fetch(`${API_URL}/api/payments/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                transactionId: paymentRes.transaction_id,
                txRef: txRef
              })
            });
            const verifyData = await verifyResponse.json();
            if (verifyResponse.ok) {
              showToast('Payment successful! Funds are in secure escrow.', 'success');
              fetchProduct();
              navigate('/profile');
            } else {
              showToast(verifyData.message || 'Verification failed', 'error');
            }
          } catch (err) {
            showToast('Verification request failed', 'error');
          }
        },
        onclose: () => {
          showToast('Payment window closed.', 'warning');
        }
      });
      
    } catch (err) {
      showToast('Error preparing payment checkout', 'error');
    }
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

  const averageRating = product.seller.ratings?.length > 0
    ? (product.seller.ratings.reduce((acc, curr) => acc + curr.rating, 0) / product.seller.ratings.length).toFixed(1)
    : null;

  return (
    <div style={styles.container} className="container animate-fade-in">
      {/* Back Navigation */}
      <button onClick={() => navigate(-1)} style={styles.backBtn}>
        ← Back
      </button>

      <div className="details-grid">
        
        {/* Left side: Image and details */}
        <div>
          <div style={styles.imageCard} className="glass-panel image-details-box">
            {product.image ? (
              <img src={product.image} alt={product.name} style={styles.image} />
            ) : (
              <div style={styles.placeholderImg}>
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--text-gray)" strokeWidth="1">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span style={{ marginTop: '16px' }}>No Image Available</span>
              </div>
            )}
          </div>

          <div style={styles.descriptionBox} className="glass-panel">
            <h3 style={styles.sectionTitle}>Product Description</h3>
            <p style={styles.descriptionText}>{product.description}</p>
          </div>
        </div>

        {/* Right side: Pricing, location, and seller info */}
        <div style={styles.sidebar}>
          {/* Action Card */}
          <div style={styles.actionCard} className="glass-panel">
            {product.reports?.length > 0 && (
              <div style={styles.warningAlert}>
                ⚠️ Warning: Reported by {product.reports.length} student{product.reports.length > 1 ? 's' : ''} for potential scam. Exercise caution.
              </div>
            )}
            <span style={styles.categoryBadge}>{getCategoryEmoji(product.category)} {product.category}</span>
            <h1 style={styles.name}>{product.name}</h1>
            <h2 style={styles.price}>₦{product.price.toLocaleString()}</h2>
            
            <div style={styles.detailsList}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>📍 Hostel Location:</span>
                <span style={styles.detailValue}>{product.hostelLocation}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>🎓 Faculty Location:</span>
                <span style={styles.detailValue}>{product.faculty}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>📅 Listed Date:</span>
                <span style={styles.detailValue}>{new Date(product.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {user?._id !== product.seller._id ? (
              <div style={styles.actionsGroup}>
                {product.status === 'Sold' ? (
                  <div style={styles.soldBadgeBig}>
                    🚫 Sold Out (Already Purchased)
                  </div>
                ) : (
                  <button onClick={handleBuyNow} className="btn-primary" style={{ ...styles.chatBtn, background: 'var(--gold)', borderColor: 'var(--gold)' }}>
                    💳 Secure Buy Now (Escrow)
                  </button>
                )}
                <button onClick={handleStartChat} className="btn-secondary" style={styles.chatBtn}>
                  💬 Chat with Seller
                </button>
                <div style={styles.subActions}>
                  <button onClick={handleWishlist} className="btn-secondary" style={styles.actionBtn}>
                    {isWishlisted ? '❤️ In Wishlist' : '🤍 Add to Wishlist'}
                  </button>
                  <button
                    onClick={handleReport}
                    disabled={hasReported}
                    className="btn-secondary"
                    style={{ ...styles.actionBtn, color: hasReported ? 'var(--text-gray)' : 'var(--error)' }}
                  >
                    {hasReported ? '✓ Reported' : '⚠️ Report Scam / Stolen'}
                  </button>
                </div>
                {reportMessage && <p style={styles.reportFeedback}>{reportMessage}</p>}
              </div>
            ) : (
              <div style={styles.actionsGroup}>
                <div style={styles.ownListingBadge}>
                  This is your active listing.
                </div>
                <div style={styles.subActions}>
                  <Link
                    to={`/edit/${product._id}`}
                    className="btn-primary"
                    style={{ ...styles.actionBtn, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ✏️ Edit Listing
                  </Link>
                  <button
                    onClick={handleDeleteListing}
                    className="btn-secondary"
                    style={{ ...styles.actionBtn, color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  >
                    🗑️ Delete Listing
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Seller Card */}
          <div style={styles.sellerCard} className="glass-panel">
            <h3 style={styles.sectionTitle}>Seller Information</h3>
            <div style={styles.sellerHeader}>
              <div style={styles.sellerAvatar}>
                {product.seller.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={styles.sellerNameRow}>
                  <span style={styles.sellerName}>{product.seller.name}</span>
                  {product.seller.isVerifiedStudent && (
                    <VerifiedBadge size="sm" />
                  )}
                </div>
                <div style={styles.sellerMeta}>
                  {product.seller.hostel} | {product.seller.faculty}
                </div>
              </div>
            </div>

            {/* Ratings Summary */}
            <div style={styles.ratingsSummary}>
              <span style={styles.ratingNumber}>{averageRating || 'N/A'}</span>
              <div style={styles.ratingStars}>
                {'★'.repeat(Math.round(averageRating || 0)) + '☆'.repeat(5 - Math.round(averageRating || 0))}
              </div>
              <span style={styles.ratingCount}>({product.seller.ratings?.length || 0} reviews)</span>
            </div>

            {/* Reviews list */}
            {product.seller.ratings?.length > 0 && (
              <div style={styles.reviewsList}>
                {product.seller.ratings.slice(0, 3).map((r, index) => (
                  <div key={index} style={styles.reviewItem}>
                    <div style={styles.reviewHeader}>
                      <span style={styles.reviewerName}>{r.reviewer?.name || 'Student'}</span>
                      <span style={styles.reviewStars}>{'★'.repeat(r.rating)}</span>
                    </div>
                    {r.review && <p style={styles.reviewText}>{r.review}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Write a review (Only if authenticated and NOT the seller) */}
            {token && user?._id !== product.seller._id && (
              <form onSubmit={handleReviewSubmit} style={styles.reviewForm}>
                <h4 style={styles.reviewFormTitle}>Rate this Seller</h4>
                <div style={styles.ratingSelectContainer}>
                  <label style={styles.reviewLabel}>Rating:</label>
                  <div style={styles.starSelection}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        onClick={() => setRating(star)}
                        style={{
                          ...styles.interactiveStar,
                          color: star <= rating ? 'var(--gold)' : 'var(--text-gray)'
                        }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span style={styles.ratingTextDescription}>
                    {rating === 5 && 'Excellent'}
                    {rating === 4 && 'Good'}
                    {rating === 3 && 'Fair'}
                    {rating === 2 && 'Bad'}
                    {rating === 1 && 'Scam Alert'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={styles.reviewLabel}>Review:</label>
                  <input
                    type="text"
                    placeholder="Describe your purchase experience..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="glass-input"
                    style={{ fontSize: '0.85rem' }}
                    required
                  />
                </div>
                <button type="submit" className="btn-secondary" style={styles.submitReviewBtn}>
                  Submit Review
                </button>
                {reviewMessage && <p style={styles.reviewFeedback}>{reviewMessage}</p>}
              </form>
            )}
          </div>
        </div>

      </div>
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
    color: '#fff',
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
    color: '#fff',
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
    color: '#fff',
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
    color: '#fff',
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
    color: '#fff',
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
    color: '#fff',
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
