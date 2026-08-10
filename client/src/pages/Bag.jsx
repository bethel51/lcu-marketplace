import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config';

export default function Bag() {
  const { cartItems, removeFromCart, clearCart } = useCart();
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Checkout modal states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  // Pickup states
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

  const handleOpenCheckout = (product) => {
    if (user?.role !== 'Buyer') {
      showToast('🔒 Only accounts registered as Buyers can buy or check out items.', 'error');
      return;
    }
    setSelectedProduct(product);
    setShowPickupModal(true);
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!token || !selectedProduct) return;

    setLoadingCheckout(true);
    try {
      const res = await fetch(`${API_URL}/api/payments/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderType: 'escrow',
          productId: selectedProduct._id,
          pickupDate,
          pickupTime,
          meetingPoint,
          buyerNote
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowPickupModal(false);
        // Remove item from cart since order is initialized
        removeFromCart(selectedProduct._id);
        showToast('Escrow order initialized successfully!', 'success');
        navigate(`/checkout/${data.order._id}?amount=${data.amount}&type=buy`);
      } else {
        showToast(data.message || 'Checkout initialization failed', 'error');
      }
    } catch {
      showToast('Network error preparing payment checkout', 'error');
    } finally {
      setLoadingCheckout(false);
    }
  };

  const cartTotal = cartItems.reduce((acc, curr) => acc + (curr.price || 0), 0);

  return (
    <div className="bag-page-root container animate-fade-in" style={{ paddingTop: '32px', paddingBottom: '90px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', fontFamily: 'var(--font-title)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          👜 My Shopping Bag
        </h1>
        {cartItems.length > 0 && (
          <button onClick={clearCart} style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--error)', padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}>
            🗑️ Clear Bag
          </button>
        )}
      </div>

      {cartItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>👜</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '8px' }}>Your bag is empty</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>Browse the student listings and add items you want to buy.</p>
          <Link to="/marketplace" className="btn-primary" style={{ padding: '12px 28px', textDecoration: 'none', display: 'inline-block' }}>
            🛍️ Browse Marketplace
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Cart items list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {cartItems.map((item) => (
              <div key={item._id} className="glass-panel" style={{ display: 'flex', gap: '16px', padding: '16px', borderRadius: '16px', alignItems: 'center', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-secondary)' }}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🖼️</div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', color: 'var(--text-secondary)' }}>
                      {item.condition || 'Good'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      📍 {item.hostelLocation || 'Campus'}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--gold)' }}>
                    ₦{item.price?.toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                  <button onClick={() => handleOpenCheckout(item)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    💳 Check Out
                  </button>
                  <button onClick={() => removeFromCart(item._id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'center' }}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Cart total summary */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginTop: '10px' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Bag Total ({cartItems.length} items)</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--gold)' }}>₦{cartTotal.toLocaleString()}</div>
            </div>
            <Link to="/marketplace" className="btn-secondary" style={{ padding: '12px 24px', textDecoration: 'none', fontWeight: 'bold' }}>
              🛍️ Continue Shopping
            </Link>
          </div>
        </div>
      )}

      {/* Checkout Schedule Modal */}
      {showPickupModal && selectedProduct && (
        <div className="profile-modal-overlay" onClick={() => setShowPickupModal(false)} style={{ zIndex: 10000 }}>
          <div className="profile-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="profile-modal-header">
              <h3 className="profile-modal-title">🤝 Schedule Campus Pickup</h3>
              <button className="profile-modal-close" onClick={() => setShowPickupModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCheckoutSubmit}>
              <div className="profile-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                  Please select your preferred meeting date, time, and point on campus. Funds remain secure in Escrow until you collect and inspect the item.
                </p>

                <div className="profile-modal-field">
                  <label className="profile-modal-label">Meeting Point *</label>
                  <select className="glass-input" value={meetingPoint} onChange={e => setMeetingPoint(e.target.value)}>
                    {LCU_MEETING_POINTS.map(p => <option key={p} value={p} style={{ background: 'var(--bg-input)' }}>{p}</option>)}
                  </select>
                </div>

                <div className="profile-modal-field">
                  <label className="profile-modal-label">Expected Date *</label>
                  <input type="date" required className="glass-input" value={pickupDate} onChange={e => setPickupDate(e.target.value)} />
                </div>

                <div className="profile-modal-field">
                  <label className="profile-modal-label">Time Window *</label>
                  <select className="glass-input" value={pickupTime} onChange={e => setPickupTime(e.target.value)}>
                    {PICKUP_TIME_SLOTS.map(t => <option key={t} value={t} style={{ background: 'var(--bg-input)' }}>{t}</option>)}
                  </select>
                </div>

                <div className="profile-modal-field">
                  <label className="profile-modal-label">Note for Seller (Optional)</label>
                  <textarea className="glass-input" rows="2" placeholder="e.g. Call me when you are close..." value={buyerNote} onChange={e => setBuyerNote(e.target.value)} style={{ resize: 'none' }} />
                </div>
              </div>

              <div className="profile-modal-footer">
                <button type="button" onClick={() => setShowPickupModal(false)} className="btn-secondary" style={{ padding: '8px 16px' }}>Cancel</button>
                <button type="submit" disabled={loadingCheckout} className="btn-primary" style={{ padding: '8px 20px' }}>
                  {loadingCheckout ? 'Preparing checkout...' : 'Proceed to Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
