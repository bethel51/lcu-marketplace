import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config';

// ── Inline SVG icons ───────────────────────────────────────────
const BagIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 01-8 0"/>
  </svg>
);

const TrashIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
);

const ImageIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

const PinIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1118 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const CardIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

const ShopIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const HandshakeIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4"/>
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
  </svg>
);

const ClockIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

// ── Component ──────────────────────────────────────────────────
export default function Bag() {
  const { cartItems, removeFromCart, clearCart } = useCart();
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  const [pickupDate, setPickupDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [pickupTime, setPickupTime] = useState('03:00 PM - 05:00 PM');
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
    'Off-Campus Location',
  ];

  const PICKUP_TIME_SLOTS = [
    '09:00 AM - 11:00 AM',
    '11:00 AM - 01:00 PM',
    '01:00 PM - 03:00 PM',
    '03:00 PM - 05:00 PM',
    '05:00 PM - 07:00 PM',
    '07:00 PM - 09:00 PM',
  ];

  const handleOpenCheckout = (product) => {
    if (user?.role !== 'Buyer') {
      showToast('Only Buyer accounts can proceed to checkout.', 'error');
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
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderType: 'escrow',
          productId: selectedProduct._id,
          pickupDate,
          pickupTime,
          meetingPoint,
          buyerNote,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowPickupModal(false);
        removeFromCart(selectedProduct._id);
        showToast('Order ready — proceeding to secure payment.', 'success');
        navigate(`/checkout/${data.order._id}?amount=${data.amount}&type=buy`);
      } else {
        showToast(data.message || 'Checkout initialization failed', 'error');
      }
    } catch {
      showToast('Network error preparing checkout', 'error');
    } finally {
      setLoadingCheckout(false);
    }
  };

  const cartTotal = cartItems.reduce((acc, curr) => acc + (curr.price || 0), 0);

  return (
    <div
      className="bag-page-root container animate-fade-in"
      style={{ paddingTop: '32px', paddingBottom: '90px', maxWidth: '800px', margin: '0 auto' }}
    >
      {/* ── Page header ───────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ display: 'inline-flex', padding: '8px', background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '12px', color: 'var(--gold)' }}>
            <BagIcon size={22} color="var(--gold)" />
          </span>
          My Shopping Bag
        </h1>
        {cartItems.length > 0 && (
          <button
            onClick={clearCart}
            style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--error)', padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <TrashIcon size={14} /> Clear Bag
          </button>
        )}
      </div>

      {/* ── Empty state ───────────────────────────────────────── */}
      {cartItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px' }}>
          <div style={{ display: 'inline-flex', padding: '20px', borderRadius: '50%', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)', marginBottom: '20px', color: 'var(--gold)' }}>
            <BagIcon size={40} color="var(--gold)" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '8px' }}>Your bag is empty</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '28px', lineHeight: '1.5' }}>
            Browse the student listings and save items you want to buy.
          </p>
          <Link to="/marketplace" className="btn-primary" style={{ padding: '12px 28px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ShopIcon size={16} /> Browse Marketplace
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── Items list ───────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cartItems.map((item) => (
              <div
                key={item._id}
                className="glass-panel"
                style={{ display: 'flex', gap: '16px', padding: '16px', borderRadius: '16px', alignItems: 'center', border: '1px solid var(--border-color)' }}
              >
                {/* Thumbnail */}
                <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  {item.image || (item.images && item.images[0]) ? (
                    <img src={item.image || item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={28} />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 6px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 8px', color: 'var(--text-secondary)' }}>
                      {item.condition || 'Good'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <PinIcon size={11} /> {item.hostelLocation || 'Campus'}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--gold)' }}>
                    ₦{item.price?.toLocaleString()}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleOpenCheckout(item)}
                    className="btn-primary"
                    style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CardIcon size={13} /> Check Out
                  </button>
                  <button
                    onClick={() => removeFromCart(item._id)}
                    style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--error)', fontSize: '0.75rem', cursor: 'pointer', padding: '5px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                  >
                    <TrashIcon size={12} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Total summary bar ────────────────────────────── */}
          <div
            className="glass-panel"
            style={{ padding: '20px 24px', borderRadius: '18px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}
          >
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                Bag Total · {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: '900', color: 'var(--gold)', lineHeight: 1 }}>
                ₦{cartTotal.toLocaleString()}
              </div>
            </div>
            <Link
              to="/marketplace"
              className="btn-secondary"
              style={{ padding: '11px 22px', textDecoration: 'none', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '7px' }}
            >
              <ShopIcon size={15} /> Continue Shopping
            </Link>
          </div>
        </div>
      )}

      {/* ── Pickup Schedule Modal ─────────────────────────────── */}
      {showPickupModal && selectedProduct && (
        <div className="profile-modal-overlay" onClick={() => setShowPickupModal(false)} style={{ zIndex: 10000 }}>
          <div className="profile-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="profile-modal-header">
              <h3 className="profile-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HandshakeIcon size={18} /> Schedule Campus Pickup
              </h3>
              <button className="profile-modal-close" onClick={() => setShowPickupModal(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit}>
              <div className="profile-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                  Select your preferred meeting date, time and campus point. Funds are held in secure Escrow until you confirm receipt of the item.
                </p>

                <div className="profile-modal-field">
                  <label className="profile-modal-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <PinIcon size={12} /> Meeting Point *
                  </label>
                  <select className="glass-input" value={meetingPoint} onChange={e => setMeetingPoint(e.target.value)}>
                    {LCU_MEETING_POINTS.map(p => <option key={p} value={p} style={{ background: 'var(--bg-input)' }}>{p}</option>)}
                  </select>
                </div>

                <div className="profile-modal-field">
                  <label className="profile-modal-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Expected Date *
                  </label>
                  <input type="date" required className="glass-input" value={pickupDate} onChange={e => setPickupDate(e.target.value)} />
                </div>

                <div className="profile-modal-field">
                  <label className="profile-modal-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <ClockIcon size={12} /> Time Window *
                  </label>
                  <select className="glass-input" value={pickupTime} onChange={e => setPickupTime(e.target.value)}>
                    {PICKUP_TIME_SLOTS.map(t => <option key={t} value={t} style={{ background: 'var(--bg-input)' }}>{t}</option>)}
                  </select>
                </div>

                <div className="profile-modal-field">
                  <label className="profile-modal-label">
                    Note for Seller (Optional)
                  </label>
                  <textarea
                    className="glass-input"
                    rows="2"
                    placeholder="e.g. Call me when you're close..."
                    value={buyerNote}
                    onChange={e => setBuyerNote(e.target.value)}
                    style={{ resize: 'none' }}
                  />
                </div>
              </div>

              <div className="profile-modal-footer">
                <button type="button" onClick={() => setShowPickupModal(false)} className="btn-secondary" style={{ padding: '9px 18px' }}>
                  Cancel
                </button>
                <button type="submit" disabled={loadingCheckout} className="btn-primary" style={{ padding: '9px 22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {loadingCheckout ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0"/></svg>
                      Preparing...
                    </>
                  ) : (
                    <>
                      <CardIcon size={14} /> Proceed to Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
