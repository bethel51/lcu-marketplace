import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config';
import { VerifiedBadge } from '../components/ProductCard';
import CheckoutModal from '../components/CheckoutModal';

const HOSTELS = [
  'Bronze Hostel','Silver Hostel','Gold Hostel','Platinum Hostel',
  'Jasper Hall','Emerald Hall','Pearl Hall','Sapphire Hall','Off-Campus'
];
const FACULTIES = [
  'Information Technology & Applied Sciences',
  'Basic Medical & Health Sciences',
  'Social & Management Sciences',
  'Arts, Education & Humanities',
  'Law'
];
const DEPTS_BY_FACULTY = {
  'Information Technology & Applied Sciences': ['Computer Science','Information Technology','Cyber Security','Software Engineering','Biochemistry','Industrial Chemistry','Microbiology','Physics with Electronics'],
  'Basic Medical & Health Sciences': ['Medicine & Surgery','Nursing Science','Medical Laboratory Science','Pharmacology','Physiotherapy','Public Health'],
  'Social & Management Sciences': ['Accounting','Banking & Finance','Business Administration','Economics','Mass Communication','Political Science','Sociology'],
  'Arts, Education & Humanities': ['English Language','History & International Studies','Philosophy','Education & English','Education & Mathematics'],
  'Law': ['Law'],
};

export default function Dashboard() {
  const { user, token, fetchProfile, verifyStudent, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [profileData, setProfileData]   = useState(null);
  const [myProducts,  setMyProducts]    = useState([]);
  const [loading,     setLoading]       = useState(true);
  const [activeTab,   setActiveTab]     = useState('overview');
  const [orders,      setOrders]        = useState({ bought: [], sold: [] });
  const [listingSearch, setListingSearch] = useState('');

  // ── Profile-settings state ──────────────────────────────────
  const [editHostel,      setEditHostel]      = useState('Off-Campus');
  const [editFaculty,     setEditFaculty]     = useState(FACULTIES[0]);
  const [editDept,        setEditDept]        = useState('');
  const [editPhone,       setEditPhone]       = useState('');
  const [editSaving,      setEditSaving]      = useState(false);
  const [deleteSaving,    setDeleteSaving]    = useState(false);

  // ── Verification state ──────────────────────────────────────
  const [showVerifyForm,  setShowVerifyForm]  = useState(false);
  const [matricInput,     setMatricInput]     = useState('');
  const [idCardFile,      setIdCardFile]      = useState(null);
  const [idCardLabel,     setIdCardLabel]     = useState('');

  // ── Checkout Modal state ────────────────────────────────────
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutOrderId, setCheckoutOrderId] = useState('');
  const [checkoutAmount, setCheckoutAmount] = useState(0);
  const [checkoutType, setCheckoutType] = useState('');

  // ── Delete Account handler ──────────────────────────────────
  const handleDeleteAccount = async () => {
    const firstConfirm = window.confirm(
      "WARNING: Are you absolutely sure you want to permanently delete your account?\n\nThis will delete your profile, all your listings, orders, and notifications. This action CANNOT be undone."
    );
    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      "FINAL CONFIRMATION:\nThis is your last chance. Click OK to permanently delete your account and all associated data."
    );
    if (!secondConfirm) return;

    setDeleteSaving(true);
    try {
      await deleteAccount();
      showToast('Your account was permanently deleted. Goodbye!', 'info');
      navigate('/');
    } catch (error) {
      showToast(error.message || 'Failed to delete account', 'error');
    } finally {
      setDeleteSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  const loadDashboard = async () => {
    setLoading(true);
    try {
      const profile = await fetchProfile();
      if (profile) {
        setProfileData(profile);
        setEditHostel(profile.hostel || 'Off-Campus');
        setEditFaculty(profile.faculty || FACULTIES[0]);
        setEditDept(profile.department || '');
        setEditPhone(profile.phoneNumber || '');
      }

      const activeUserId = profile?._id || profile?.id || user?._id || user?.id;

      if (activeUserId) {
        // Fetch THIS user's products using seller filter + auth token
        const res = await fetch(`${API_URL}/api/products?seller=${activeUserId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const all = Array.isArray(data) ? data : (data.products || []);
          setMyProducts(all);
        }

        // Fetch user orders/transactions
        const ordersRes = await fetch(`${API_URL}/api/payments/my-orders`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(ordersData);
        }
      }
    } catch {
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) loadDashboard(); }, [token]);

  // ── Copy profile share link ──────────────────────────────────
  const handleCopyProfileLink = () => {
    const url = `${window.location.origin}/marketplace?search=${encodeURIComponent(user?.name || '')}`;
    navigator.clipboard.writeText(url);
    showToast('Store link copied to clipboard! 🔗', 'success');
  };

  // ── Save profile settings ────────────────────────────────────
  const handleSaveSettings = async () => {
    if (!token) return;
    setEditSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ hostel: editHostel, faculty: editFaculty, department: editDept, phoneNumber: editPhone })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Profile updated successfully! 🎓', 'success');
        loadDashboard();
      } else {
        showToast(data.message || 'Update failed', 'error');
      }
    } catch {
      showToast('Error updating profile', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  // ── Verify student ────────────────────────────────────────────
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!matricInput.trim()) return;
    await verifyStudent(idCardFile);
    showToast('Verification request submitted! 🎓', 'success');
    setShowVerifyForm(false);
    setMatricInput(''); setIdCardFile(null); setIdCardLabel('');
    loadDashboard();
  };

  // ── Listing actions ───────────────────────────────────────────
  const handleToggleSold = async (id, status) => {
    const next = status === 'Available' ? 'Sold' : 'Available';
    try {
      const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: next })
      });
      if (res.ok) { showToast(`Marked as ${next}! 🤝`, 'success'); loadDashboard(); }
    } catch { showToast('Failed to update status', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listing permanently?')) return;
    try {
      const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { showToast('Listing deleted!', 'success'); loadDashboard(); }
    } catch { showToast('Failed to delete', 'error'); }
  };

  const handleConfirmDelivery = async (orderId) => {
    if (!window.confirm('Have you physically received the product? This will permanently release the escrowed funds to the seller.')) return;
    try {
      const res = await fetch(`${API_URL}/api/payments/confirm-delivery/${orderId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Escrow funds released to the seller! 🤝', 'success');
        loadDashboard();
      } else {
        showToast(data.message || 'Failed to release funds', 'error');
      }
    } catch {
      showToast('Error releasing funds', 'error');
    }
  };

  const handleBoostListing = async (productId) => {
    try {
      const response = await fetch(`${API_URL}/api/payments/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderType: 'boost',
          productId
        })
      });
      const resData = await response.json();
      if (!response.ok) {
        showToast(resData.message || 'Boost initialization failed', 'error');
        return;
      }
      const { order, amount } = resData;
      setCheckoutOrderId(order._id);
      setCheckoutAmount(amount);
      setCheckoutType('boost');
      setShowCheckoutModal(true);
    } catch {
      showToast('Error initializing boost payment', 'error');
    }
  };

  const handlePayVerificationFee = async () => {
    try {
      const response = await fetch(`${API_URL}/api/payments/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderType: 'verification'
        })
      });
      const resData = await response.json();
      if (!response.ok) {
        showToast(resData.message || 'Verification initialization failed', 'error');
        return;
      }
      const { order, amount } = resData;
      setCheckoutOrderId(order._id);
      setCheckoutAmount(amount);
      setCheckoutType('verification');
      setShowCheckoutModal(true);
    } catch {
      showToast('Error initializing verification payment', 'error');
    }
  };

  // ── Derived stats ─────────────────────────────────────────────
  const activeCount  = myProducts.filter(p => p.status === 'Available').length;
  const soldCount    = myProducts.filter(p => p.status === 'Sold').length;
  const wishCount    = profileData?.wishlist?.length || 0;
  const ratings      = profileData?.ratings || [];
  const avgRating    = ratings.length > 0
    ? (ratings.reduce((a,c) => a + c.rating, 0) / ratings.length).toFixed(1)
    : '—';

  const filteredMyProducts = useMemo(() => {
    if (!listingSearch.trim()) return myProducts;
    const q = listingSearch.toLowerCase();
    return myProducts.filter(p => 
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.hostelLocation?.toLowerCase().includes(q)
    );
  }, [myProducts, listingSearch]);

  // ── Loading ───────────────────────────────────────────────────
  if (loading) return (
    <div style={{ height:'60vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'16px' }} className="container">
      <div style={{ width:'44px', height:'44px', border:'4px solid var(--border-color)', borderTop:'4px solid var(--gold)', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <p style={{ color:'var(--text-secondary)', fontSize:'0.9rem' }}>Loading your dashboard…</p>
    </div>
  );

  const currentDepts = DEPTS_BY_FACULTY[editFaculty] || [];

  const navTabs = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'listings', icon: '📦', label: 'My Listings', badge: myProducts.length },
    { id: 'orders',   icon: '💳', label: 'Transactions', badge: (orders.bought?.length || 0) + (orders.sold?.length || 0) },
    { id: 'wishlist', icon: '❤️', label: 'Wishlist', badge: wishCount },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  return (
    <>
      <div className="dash-shell animate-fade-in">

        {/* ═══════════════════ SIDEBAR ═══════════════════ */}
        <aside className="dash-sidebar">
          {/* Profile Mini Card */}
          <div className="dash-sidebar-profile">
            <div className="dash-avatar-ring">
              <div className="dash-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
            </div>
            <h3 className="dash-sidebar-name">{profileData?.name || user?.name}</h3>
            <p className="dash-sidebar-email">{user?.email}</p>
            <div className="dash-sidebar-badges">
              {user?.isEmailVerified
                ? <span className="dash-status-pill verified">✉️ Verified</span>
                : <span className="dash-status-pill unverified">✉️ Unverified</span>
              }
              {user?.isVerifiedStudent
                ? <span className="dash-status-pill verified">🎓 LCU Verified</span>
                : <span className="dash-status-pill unverified">⏳ Pending</span>
              }
            </div>
          </div>

          {/* Navigation */}
          <nav className="dash-nav">
            {navTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`dash-nav-item${activeTab === tab.id ? ' active' : ''}`}
              >
                <span className="dash-nav-icon">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge > 0 && <span className="dash-nav-badge">{tab.badge}</span>}
              </button>
            ))}
          </nav>

          {/* Quick Actions */}
          <div className="dash-sidebar-actions">
            <Link to="/post" className="dash-action-btn primary">＋ Post New Listing</Link>
            <button onClick={handleCopyProfileLink} className="dash-action-btn">🔗 Copy Store Link</button>
            <Link to="/marketplace" className="dash-action-btn">🛍️ Browse Marketplace</Link>
          </div>
        </aside>

        {/* ═══════════════════ MAIN CONTENT ═══════════════════ */}
        <main className="dash-main">
          {/* Mobile sub-tabs at the top of Dashboard (only on mobile) */}
          <div className="dash-mobile-top-tabs">
            {navTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`dash-mobile-top-tab-item${activeTab === tab.id ? ' active' : ''}`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge > 0 && <span className="dash-mobile-top-tab-badge">{tab.badge}</span>}
              </button>
            ))}
          </div>

          {/* ── Welcome Banner ──────────────────────────────── */}
          <div className="dash-banner">
            <div>
              <h1 className="dash-banner-title">Hey, {user?.name?.split(' ')[0]}! 👋</h1>
              <p className="dash-banner-sub">Welcome to your Lead City student dashboard</p>
              <div className="dash-banner-chips">
                <span className="dash-banner-chip">📧 {user?.email}</span>
                {profileData?.faculty && <span className="dash-banner-chip">🏛️ {profileData.faculty}</span>}
                {profileData?.matricNumber && <span className="dash-banner-chip">🪪 {profileData.matricNumber}</span>}
              </div>
            </div>
            <div className="dash-wallet-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
              <span className="dash-wallet-label">Wallet Balance</span>
              <span className="dash-wallet-amount">₦{(profileData?.walletBalance || 0).toLocaleString()}</span>
              <button
                onClick={() => navigate('/withdraw')}
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  marginTop: '8px',
                  width: '100%',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.2s'
                }}
              >
                💸 Withdraw Funds
              </button>
            </div>
          </div>

          {/* Quick Actions for Mobile */}
          <div className="dash-mobile-quick-actions">
            <button onClick={handleCopyProfileLink} className="btn-secondary" style={{ flex: 1, padding: '12px', fontSize: '0.82rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', border: '1px solid var(--border-color)' }}>
              🔗 Copy Store Link
            </button>
            <Link to="/post" className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: '0.82rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
              ＋ Post Item
            </Link>
          </div>

          {/* ══════════ OVERVIEW TAB ══════════ */}
          {activeTab === 'overview' && (
            <>
              {/* Metrics */}
              <div className="dash-metrics">
                {[
                  { icon: '📦', value: activeCount, label: 'Active Listings' },
                  { icon: '🤝', value: soldCount,   label: 'Items Sold' },
                  { icon: '❤️', value: wishCount,   label: 'Wishlist Items' },
                  { icon: '⭐', value: avgRating,   label: 'Seller Rating' },
                ].map(m => (
                  <div 
                    key={m.label} 
                    className="dash-metric"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      if (m.label === 'Active Listings') setActiveTab('listings');
                      else if (m.label === 'Items Sold') setActiveTab('orders');
                      else if (m.label === 'Wishlist Items') setActiveTab('wishlist');
                      else if (m.label === 'Seller Rating') showToast('Detailed ratings page coming soon!', 'info');
                    }}
                  >
                    <div className="dash-metric-icon">{m.icon}</div>
                    <div className="dash-metric-value">{m.value}</div>
                    <div className="dash-metric-label">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Verification */}
              {!user?.isVerifiedStudent ? (
                <div className="dash-verify-card">
                  <div className="dash-verify-title">🎓 Student Verification</div>
                  {showVerifyForm ? (
                    <form onSubmit={handleVerifySubmit} style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                      <input
                        type="text" required placeholder="Your matric number"
                        value={matricInput} onChange={e => setMatricInput(e.target.value)}
                        className="glass-input" style={{ maxWidth:'300px' }}
                      />
                      <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                        <label htmlFor="id-upload-dash" className="btn-secondary" style={{ padding:'8px 14px', fontSize:'0.82rem', cursor:'pointer' }}>
                          {idCardLabel || '📎 Upload ID Card'}
                        </label>
                        <input id="id-upload-dash" type="file" accept="image/*" style={{ display:'none' }}
                          onChange={e => { setIdCardFile(e.target.files[0]); setIdCardLabel(e.target.files[0]?.name || ''); }}
                        />
                        <button type="submit" className="btn-primary" style={{ padding:'8px 16px', fontSize:'0.82rem' }}>Submit</button>
                        <button type="button" onClick={() => setShowVerifyForm(false)} className="btn-secondary" style={{ padding:'8px 14px', fontSize:'0.82rem' }}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className="dash-verify-actions">
                      <button onClick={() => setShowVerifyForm(true)} className="btn-secondary" style={{ padding:'8px 16px', fontSize:'0.82rem' }}>📎 Submit ID Form</button>
                      <button onClick={handlePayVerificationFee} className="btn-primary" style={{ padding:'10px 22px', fontSize:'0.85rem' }}>🎓 Get Instant Verified (₦1,000)</button>
                    </div>
                  )}
                  <p className="dash-verify-hint">Upload your student ID to get a verified badge and build trust with buyers.</p>
                </div>
              ) : (
                <div style={{ marginBottom:'24px' }}>
                  <VerifiedBadge size="lg" />
                </div>
              )}

              {/* Profile Info Grid */}
              <div className="dash-section-header">
                <h2 className="dash-section-title">👤 Profile Information</h2>
              </div>
              <div className="dash-profile-grid">
                {[
                  { icon:'🪪', label:'Matric No.', value: profileData?.matricNumber || '—' },
                  { icon:'🏛️', label:'Faculty',    value: profileData?.faculty || '—' },
                  { icon:'📚', label:'Department', value: profileData?.department || '—' },
                  { icon:'🏠', label:'Hostel',     value: profileData?.hostel || '—' },
                  { icon:'📞', label:'Phone',      value: profileData?.phoneNumber || '—' },
                  { icon:'⭐', label:'Rating',     value: avgRating !== '—' ? `${avgRating} / 5.0 (${ratings.length} reviews)` : 'No reviews yet' },
                ].map(row => (
                  <div key={row.label} className="dash-profile-item">
                    <span className="dash-profile-label">{row.icon} {row.label}</span>
                    <span className="dash-profile-value">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Recent Purchases Widget */}
              <div className="dash-section-header" style={{ marginTop: '28px' }}>
                <h2 className="dash-section-title">🛒 Recent Purchases</h2>
                <button onClick={() => setActiveTab('orders')} className="btn-secondary" style={{ padding:'6px 14px', fontSize:'0.78rem' }}>View All →</button>
              </div>
              {orders.bought && orders.bought.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
                  {orders.bought.slice(0, 3).map(o => (
                    <div key={o._id} className="dash-order-card" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                      <div className="dash-order-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <h4 className="dash-order-name" style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                            {o.product ? o.product.name : 'Deleted Product'}
                          </h4>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <span>Amount: <strong style={{ color: 'var(--gold)' }}>₦{o.amount.toLocaleString()}</strong></span>
                            <span>Seller: <strong>{o.seller?.name || 'Unknown'}</strong></span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className="dash-status-pill" style={{ 
                            background: o.paymentStatus === 'Paid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: o.paymentStatus === 'Paid' ? 'var(--success)' : 'var(--warning)',
                            fontSize: '0.75rem',
                            padding: '4px 10px',
                            borderRadius: '12px'
                          }}>
                            {o.paymentStatus}
                          </span>
                          {o.paymentStatus === 'Paid' && o.escrowStatus === 'Held' && (
                            <button 
                              onClick={() => handleConfirmDelivery(o._id)} 
                              className="btn-primary" 
                              style={{ padding: '6px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                            >
                              🤝 Confirm & Release
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed var(--border-color)', borderRadius: '12px', marginBottom: '28px' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>You haven't purchased any items recently.</p>
                </div>
              )}

              {/* Recent Listings Preview */}
              {myProducts.length > 0 && (
                <>
                  <div className="dash-section-header">
                    <h2 className="dash-section-title">📦 Recent Listings</h2>
                    <button onClick={() => setActiveTab('listings')} className="btn-secondary" style={{ padding:'6px 14px', fontSize:'0.78rem' }}>View All →</button>
                  </div>
                  <div className="dash-listing-grid">
                    {myProducts.slice(0, 3).map(p => (
                      <div key={p._id} className="dash-listing-card">
                        {p.image
                          ? <img src={p.image} alt={p.name} className="dash-listing-img" />
                          : <div className="dash-listing-placeholder">🖼️</div>
                        }
                        <div className="dash-listing-info">
                          <h4 className="dash-listing-name">{p.name}</h4>
                          <span className="dash-listing-price">₦{p.price.toLocaleString()}</span>
                          <div className="dash-listing-meta">
                            <span>📍 {p.hostelLocation}</span>
                            <span className={`dash-status-badge ${p.status === 'Sold' ? 'sold' : 'available'}`}>{p.status}</span>
                          </div>
                        </div>
                        <Link to={`/product/${p._id}`} className="btn-secondary" style={{ padding:'8px 14px', fontSize:'0.78rem', flexShrink:0 }}>View →</Link>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* ══════════ LISTINGS TAB ══════════ */}
          {activeTab === 'listings' && (
            <>
              <div className="dash-section-header">
                <h2 className="dash-section-title">📦 My Listings <span className="dash-section-count">{myProducts.length}</span></h2>
                <Link to="/post" className="btn-primary" style={{ padding:'8px 18px', fontSize:'0.82rem' }}>+ New Listing</Link>
              </div>

              {/* Listings Search */}
              <div className="mkt-search-wrap" style={{ marginBottom: '16px' }}>
                <span className="mkt-search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Filter your listings by title, category, or location..."
                  value={listingSearch}
                  onChange={e => setListingSearch(e.target.value)}
                  className="glass-input mkt-search-input"
                />
                {listingSearch && (
                  <button onClick={() => setListingSearch('')} className="mkt-search-clear">✕</button>
                )}
              </div>

              {filteredMyProducts.length > 0 ? (
                <div className="dash-listing-grid">
                  {filteredMyProducts.map(p => (
                    <div key={p._id} className="dash-listing-card">
                      {p.image
                        ? <img src={p.image} alt={p.name} className="dash-listing-img" />
                        : <div className="dash-listing-placeholder">🖼️</div>
                      }
                      <div className="dash-listing-info">
                        <h4 className="dash-listing-name">{p.name}</h4>
                        <span className="dash-listing-price">₦{p.price.toLocaleString()}</span>
                        <div className="dash-listing-meta">
                          <span>📍 {p.hostelLocation}</span>
                          <span className={`dash-status-badge ${p.status === 'Sold' ? 'sold' : 'available'}`}>{p.status}</span>
                          {p.isBoosted ? (
                            <span className="dash-boosted-badge">🚀 Boosted</span>
                          ) : (
                            p.status !== 'Sold' && (
                              <button onClick={() => handleBoostListing(p._id)} className="dash-boost-link">🚀 Boost (₦500)</button>
                            )
                          )}
                        </div>
                      </div>
                      <div className="dash-listing-actions">
                        <button
                          onClick={() => handleToggleSold(p._id, p.status)}
                          className="btn-secondary"
                          style={{
                            padding:'8px 14px', fontSize:'0.78rem', whiteSpace:'nowrap',
                            color: p.status === 'Sold' ? 'var(--success)' : 'var(--text-secondary)',
                            borderColor: p.status === 'Sold' ? 'rgba(16,185,129,0.4)' : 'var(--border-color)'
                          }}
                        >
                          {p.status === 'Sold' ? '↩ Relist' : '✓ Mark Sold'}
                        </button>
                        <Link to={`/edit/${p._id}`} className="btn-secondary" style={{ padding:'8px 14px', fontSize:'0.78rem' }}>✏️ Edit</Link>
                        <button onClick={() => handleDelete(p._id)} className="btn-danger" style={{ padding:'8px 14px' }}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dash-empty">
                  <div className="dash-empty-icon">📭</div>
                  <p className="dash-empty-title">No matching listings</p>
                  <p className="dash-empty-sub">Start selling by posting your first product on the marketplace.</p>
                  <Link to="/post" className="btn-primary">+ Post a Listing</Link>
                </div>
              )}
            </>
          )}

          {/* ══════════ ORDERS TAB ══════════ */}
          {activeTab === 'orders' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'28px' }}>
              {/* Bought */}
              <div className="dash-order-section">
                <h3 className="dash-order-section-title">🛒 Things You Bought</h3>
                {orders.bought?.length > 0 ? (
                  orders.bought.map(o => (
                    <div key={o._id} className="dash-order-card">
                      <div className="dash-order-info">
                        <h4 className="dash-order-name">{o.product ? o.product.name : 'Deleted Product'}</h4>
                        <span className="dash-order-amount">₦{o.amount.toLocaleString()}</span>
                        <div className="dash-order-meta">
                          <span>Seller: <strong>{o.seller?.name || 'Unknown'}</strong></span>
                          <span>Ref: {o.txRef}</span>
                          <span className="dash-order-status" style={{ color: o.paymentStatus === 'Paid' ? 'var(--success)' : 'var(--warning)' }}>
                            Payment: {o.paymentStatus}
                          </span>
                          <span className="dash-order-status" style={{ color: o.escrowStatus === 'Released' ? 'var(--success)' : 'var(--gold)' }}>
                            Status: {o.escrowStatus}
                          </span>
                        </div>

                        {/* Scheduled Campus Pickup Details */}
                        {o.meetingPoint && (
                          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <div>📍 <strong>Meeting Point:</strong> <span style={{ color: 'var(--gold)', fontWeight: '700' }}>{o.meetingPoint}</span></div>
                            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                              <span>📅 <strong>Date:</strong> {o.pickupDate || 'Flexible'}</span>
                              <span>⏰ <strong>Time:</strong> {o.pickupTime || 'Flexible'}</span>
                            </div>
                            {o.buyerNote && <div>📝 <strong>Note:</strong> <em>"{o.buyerNote}"</em></div>}
                          </div>
                        )}
                      </div>
                      {o.paymentStatus === 'Paid' && o.escrowStatus === 'Held' && (
                        <button onClick={() => handleConfirmDelivery(o._id)} className="btn-primary" style={{ padding:'8px 16px', fontSize:'0.8rem', whiteSpace:'nowrap', flexShrink:0 }}>
                          🤝 Release Funds
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize:'0.85rem', color:'var(--text-secondary)' }}>You haven't bought any items yet.</p>
                )}
              </div>

              {/* Sold */}
              <div className="dash-order-section">
                <h3 className="dash-order-section-title">💰 Things You Sold</h3>
                {orders.sold?.length > 0 ? (
                  orders.sold.map(o => (
                    <div key={o._id} className="dash-order-card sold-order">
                      <div className="dash-order-info">
                        <h4 className="dash-order-name">{o.product ? o.product.name : 'Deleted Product'}</h4>
                        <span className="dash-order-amount">₦{o.amount.toLocaleString()}</span>
                        <div className="dash-order-meta">
                          <span>Buyer: <strong>{o.buyer?.name || 'Unknown'}</strong></span>
                          <span>Ref: {o.txRef}</span>
                          <span className="dash-order-status" style={{ color: o.paymentStatus === 'Paid' ? 'var(--success)' : 'var(--warning)' }}>
                            Payment: {o.paymentStatus}
                          </span>
                          <span className="dash-order-status" style={{ color: o.escrowStatus === 'Released' ? 'var(--success)' : 'var(--gold)' }}>
                            Status: {o.escrowStatus}
                          </span>
                        </div>

                        {/* Scheduled Campus Pickup Details */}
                        {o.meetingPoint && (
                          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <div>📍 <strong>Meeting Point:</strong> <span style={{ color: 'var(--gold)', fontWeight: '700' }}>{o.meetingPoint}</span></div>
                            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                              <span>📅 <strong>Date:</strong> {o.pickupDate || 'Flexible'}</span>
                              <span>⏰ <strong>Time:</strong> {o.pickupTime || 'Flexible'}</span>
                            </div>
                            {o.buyerNote && <div>📝 <strong>Buyer Note:</strong> <em>"{o.buyerNote}"</em></div>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize:'0.85rem', color:'var(--text-secondary)' }}>You haven't sold anything yet.</p>
                )}
              </div>
            </div>
          )}

          {/* ══════════ WISHLIST TAB ══════════ */}
          {activeTab === 'wishlist' && (
            <>
              <div className="dash-section-header">
                <h2 className="dash-section-title">❤️ Wishlist <span className="dash-section-count">{wishCount}</span></h2>
              </div>
              {profileData?.wishlist?.length > 0 ? (
                <div className="dash-listing-grid">
                  {profileData.wishlist.map(p => (
                    <div key={p._id} className="dash-listing-card">
                      {p.image
                        ? <img src={p.image} alt={p.name} className="dash-listing-img" />
                        : <div className="dash-listing-placeholder">🖼️</div>
                      }
                      <div className="dash-listing-info">
                        <h4 className="dash-listing-name">{p.name}</h4>
                        <span className="dash-listing-price">₦{p.price?.toLocaleString()}</span>
                        <div className="dash-listing-meta">
                          <span>📍 {p.hostelLocation}</span>
                          <span className={`dash-status-badge ${p.status === 'Sold' ? 'sold' : 'available'}`}>
                            {p.status || 'Available'}
                          </span>
                        </div>
                      </div>
                      <div className="dash-listing-actions" style={{ display: 'flex', gap: '8px' }}>
                        <Link to={`/product/${p._id}`} className="btn-primary" style={{ padding:'8px 14px', fontSize:'0.78rem', flexShrink:0 }}>
                          💳 Buy / View
                        </Link>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`${API_URL}/api/products/${p._id}/wishlist`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}` }
                              });
                              if (res.ok) {
                                showToast('Removed from Wishlist', 'info');
                                loadDashboard();
                              }
                            } catch {
                              showToast('Error removing item', 'error');
                            }
                          }}
                          className="btn-danger"
                          style={{ padding:'8px 12px', fontSize:'0.78rem' }}
                          title="Remove from Wishlist"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dash-empty">
                  <div className="dash-empty-icon">💔</div>
                  <p className="dash-empty-title">Your wishlist is empty</p>
                  <p className="dash-empty-sub">Browse the marketplace and save items you love.</p>
                  <Link to="/marketplace" className="btn-secondary">🛍️ Browse Marketplace</Link>
                </div>
              )}
            </>
          )}

          {/* ══════════ SETTINGS TAB ══════════ */}
          {activeTab === 'settings' && (
            <>
              <div className="dash-section-header">
                <h2 className="dash-section-title">⚙️ Account Settings</h2>
              </div>

              <div className="dash-settings-section">
                <p className="dash-settings-title">Profile Information</p>
                <div className="dash-settings-grid">
                  <div className="dash-settings-field">
                    <label className="dash-settings-label">Hostel / Location</label>
                    <select value={editHostel} onChange={e => setEditHostel(e.target.value)} className="glass-input">
                      {HOSTELS.map(h => <option key={h} value={h} style={{ background:'var(--bg-input)', color:'var(--text-primary)' }}>{h}</option>)}
                    </select>
                  </div>
                  <div className="dash-settings-field">
                    <label className="dash-settings-label">Faculty</label>
                    <select value={editFaculty} onChange={e => { setEditFaculty(e.target.value); setEditDept(''); }} className="glass-input">
                      {FACULTIES.map(f => <option key={f} value={f} style={{ background:'var(--bg-input)', color:'var(--text-primary)' }}>{f}</option>)}
                    </select>
                  </div>
                  <div className="dash-settings-field">
                    <label className="dash-settings-label">Department</label>
                    <select value={editDept} onChange={e => setEditDept(e.target.value)} className="glass-input">
                      <option value="" style={{ background:'var(--bg-input)', color:'var(--text-primary)' }}>— Select —</option>
                      {currentDepts.map(d => <option key={d} value={d} style={{ background:'var(--bg-input)', color:'var(--text-primary)' }}>{d}</option>)}
                    </select>
                  </div>
                  <div className="dash-settings-field">
                    <label className="dash-settings-label">Phone Number</label>
                    <input
                      type="tel" maxLength="11" placeholder="e.g. 08012345678"
                      value={editPhone} onChange={e => setEditPhone(e.target.value.replace(/\D/g, ''))}
                      className="glass-input"
                    />
                  </div>
                </div>
                <div style={{ marginTop:'20px', display:'flex', justifyContent:'flex-end' }}>
                  <button onClick={handleSaveSettings} disabled={editSaving} className="btn-primary" style={{ padding:'10px 24px', fontSize:'0.88rem' }}>
                    {editSaving ? 'Saving…' : '💾 Save Changes'}
                  </button>
                </div>
              </div>



              {/* Verification settings */}
              {!user?.isVerifiedStudent && (
                <div className="dash-settings-section">
                  <p className="dash-settings-title">Student Verification</p>
                  <p style={{ fontSize:'0.85rem', color:'var(--text-secondary)', marginBottom:'16px' }}>
                    Get verified to build trust with buyers and unlock premium features.
                  </p>
                  {showVerifyForm ? (
                    <form onSubmit={handleVerifySubmit} style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                      <input
                        type="text" required placeholder="Your matric number"
                        value={matricInput} onChange={e => setMatricInput(e.target.value)}
                        className="glass-input" style={{ maxWidth:'300px' }}
                      />
                      <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                        <label htmlFor="id-upload-settings" className="btn-secondary" style={{ padding:'8px 14px', fontSize:'0.82rem', cursor:'pointer' }}>
                          {idCardLabel || '📎 Upload ID Card'}
                        </label>
                        <input id="id-upload-settings" type="file" accept="image/*" style={{ display:'none' }}
                          onChange={e => { setIdCardFile(e.target.files[0]); setIdCardLabel(e.target.files[0]?.name || ''); }}
                        />
                        <button type="submit" className="btn-primary" style={{ padding:'8px 16px', fontSize:'0.82rem' }}>Submit</button>
                        <button type="button" onClick={() => setShowVerifyForm(false)} className="btn-secondary" style={{ padding:'8px 14px', fontSize:'0.82rem' }}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className="dash-verify-actions">
                      <button onClick={() => setShowVerifyForm(true)} className="btn-secondary" style={{ padding:'8px 16px', fontSize:'0.82rem' }}>📎 Submit ID Form</button>
                      <button onClick={handlePayVerificationFee} className="btn-primary" style={{ padding:'10px 22px', fontSize:'0.85rem' }}>🎓 Get Instant Verified (₦1,000)</button>
                    </div>
                  )}
                </div>
              )}

              {user?.isVerifiedStudent && (
                <div className="dash-settings-section">
                  <p className="dash-settings-title">Verification Status</p>
                  <VerifiedBadge size="lg" />
                  <p style={{ fontSize:'0.82rem', color:'var(--text-secondary)', marginTop:'10px' }}>Your account is verified as an LCU student.</p>
                </div>
              )}

              {/* Danger Zone */}
              <div className="dash-settings-section" style={{
                marginTop: '32px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.03) 0%, rgba(0, 0, 0, 0) 100%)',
                borderRadius: '16px',
                padding: '24px'
              }}>
                <p className="dash-settings-title" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  ⚠️ Danger Zone
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
                  Once you delete your account, there is no going back. All of your products, orders, history, and profile data will be permanently removed.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteSaving}
                    className="btn-danger"
                    style={{
                      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                      color: '#fff',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '12px',
                      fontSize: '0.88rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(220, 38, 38, 0.25)',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(220, 38, 38, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 14px rgba(220, 38, 38, 0.25)';
                    }}
                  >
                    {deleteSaving ? 'Deleting Account…' : '🗑️ Delete Account Permanently'}
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* ═══════════════════ MOBILE BOTTOM NAV ═══════════════════ */}
      <div className="dash-mobile-toggle">
        <div className="dash-mobile-nav">
          {navTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`dash-mobile-nav-item${activeTab === tab.id ? ' active' : ''}`}
            >
              <span className="dash-mobile-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        orderId={checkoutOrderId}
        amount={checkoutAmount}
        onSuccess={() => {
          if (checkoutType === 'boost') {
            showToast('Listing boosted successfully! 🚀', 'success');
          } else {
            showToast('Verification fee paid and account verified! 🎓', 'success');
          }
          loadDashboard();
        }}
      />
    </>
  );
}
