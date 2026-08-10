import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config';
import { VerifiedBadge } from '../components/ProductCard';

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

  // Redirect PRO sellers to their specialized dashboard
  useEffect(() => {
    if (user?.isPro) {
      navigate('/pro-dashboard', { replace: true });
    }
  }, [user, navigate]);

  const [profileData, setProfileData]   = useState(null);
  const wishCount                       = profileData?.wishlist?.length || 0;
  const [myProducts,  setMyProducts]    = useState([]);
  const [loading,     setLoading]       = useState(true);
  const [activeTab,   setActiveTab]     = useState('overview');
  const [orders,      setOrders]        = useState({ bought: [], sold: [] });
  const [listingSearch, setListingSearch] = useState('');
  const [showBalance, setShowBalance]     = useState(false);
  const [subTab, setSubTab]               = useState('active'); // 'active' | 'sold' | 'drafts'

  const [readCounts, setReadCounts] = useState(() => ({
    listings: parseInt(localStorage.getItem('lcu_read_listings_count') ?? '-1'),
    orders: parseInt(localStorage.getItem('lcu_read_orders_count') ?? '-1'),
    wishlist: parseInt(localStorage.getItem('lcu_read_wishlist_count') ?? '-1'),
  }));


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
        // Fetch products and orders IN PARALLEL — much faster
        const [productsRes, ordersRes] = await Promise.all([
          fetch(`${API_URL}/api/products?seller=${activeUserId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_URL}/api/payments/my-orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (productsRes.ok) {
          const data = await productsRes.json();
          const all = Array.isArray(data) ? data : (data.products || []);
          setMyProducts(all);
        }
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

  // Initialise read counts if they are not set (-1)
  useEffect(() => {
    if (myProducts.length > 0 && readCounts.listings === -1) {
      localStorage.setItem('lcu_read_listings_count', myProducts.length);
      setReadCounts(prev => ({ ...prev, listings: myProducts.length }));
    }
  }, [myProducts, readCounts.listings]);

  useEffect(() => {
    const totalOrders = (orders.bought?.length || 0) + (orders.sold?.length || 0);
    if (totalOrders > 0 && readCounts.orders === -1) {
      localStorage.setItem('lcu_read_orders_count', totalOrders);
      setReadCounts(prev => ({ ...prev, orders: totalOrders }));
    }
  }, [orders, readCounts.orders]);

  useEffect(() => {
    if (wishCount > 0 && readCounts.wishlist === -1) {
      localStorage.setItem('lcu_read_wishlist_count', wishCount);
      setReadCounts(prev => ({ ...prev, wishlist: wishCount }));
    }
  }, [wishCount, readCounts.wishlist]);

  // If tab is currently active, keep read counts synced
  useEffect(() => {
    if (activeTab === 'listings') {
      localStorage.setItem('lcu_read_listings_count', myProducts.length);
      setReadCounts(prev => ({ ...prev, listings: myProducts.length }));
    } else if (activeTab === 'orders') {
      const totalOrders = (orders.bought?.length || 0) + (orders.sold?.length || 0);
      localStorage.setItem('lcu_read_orders_count', totalOrders);
      setReadCounts(prev => ({ ...prev, orders: totalOrders }));
    } else if (activeTab === 'wishlist') {
      localStorage.setItem('lcu_read_wishlist_count', wishCount);
      setReadCounts(prev => ({ ...prev, wishlist: wishCount }));
    }
  }, [activeTab, myProducts.length, orders, wishCount]);

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
      navigate(`/checkout/${order._id}?amount=${amount}&type=boost`);
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
      navigate(`/checkout/${order._id}?amount=${amount}&type=verification`);
    } catch {
      showToast('Error initializing verification payment', 'error');
    }
  };

  const handleUpgradeToPro = async () => {
    try {
      const response = await fetch(`${API_URL}/api/payments/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderType: 'pro_upgrade'
        })
      });
      const resData = await response.json();
      if (!response.ok) {
        showToast(resData.message || 'PRO upgrade initialization failed', 'error');
        return;
      }
      const { order, amount } = resData;
      navigate(`/checkout/${order._id}?amount=${amount}&type=pro_upgrade`);
    } catch {
      showToast('Error initializing PRO upgrade payment', 'error');
    }
  };

  // ── Derived stats ─────────────────────────────────────────────
  const activeCount  = myProducts.filter(p => p.status === 'Available').length;
  const soldCount    = myProducts.filter(p => p.status === 'Sold').length;
  const ratings      = profileData?.ratings || [];
  const avgRating    = ratings.length > 0
    ? (ratings.reduce((a,c) => a + c.rating, 0) / ratings.length).toFixed(1)
    : '—';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

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
    { id: 'listings', icon: '📦', label: 'My Listings', badge: Math.max(0, myProducts.length - (readCounts.listings === -1 ? myProducts.length : readCounts.listings)) },
    { id: 'orders',   icon: '💳', label: 'Transactions', badge: Math.max(0, ((orders.bought?.length || 0) + (orders.sold?.length || 0)) - (readCounts.orders === -1 ? ((orders.bought?.length || 0) + (orders.sold?.length || 0)) : readCounts.orders)) },
    { id: 'wishlist', icon: '👜', label: 'My Bag', badge: Math.max(0, wishCount - (readCounts.wishlist === -1 ? wishCount : readCounts.wishlist)) },
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
            {!user?.isPro && (
              <button 
                onClick={handleUpgradeToPro} 
                className="dash-action-btn"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(202,138,4,0.15) 100%)', 
                  border: '1px solid #f59e0b', 
                  color: '#fef08a',
                  fontWeight: '800'
                }}
              >
                👑 Become a PRO
              </button>
            )}
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
              <h1 className="dash-banner-title">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
              <p className="dash-banner-sub">Welcome to your Lead City student dashboard</p>
              <div className="dash-banner-chips">
                <span className="dash-banner-chip">📧 {user?.email}</span>
                {profileData?.faculty && <span className="dash-banner-chip">🏛️ {profileData.faculty}</span>}
                {profileData?.matricNumber && <span className="dash-banner-chip">🪪 {profileData.matricNumber}</span>}
              </div>
            </div>
            <div className="dash-wallet-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
              <span className="dash-wallet-label">Wallet Balance</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="dash-wallet-amount">
                  {showBalance ? `₦${(profileData?.walletBalance || 0).toLocaleString()}` : '****'}
                </span>
                <button 
                  onClick={() => setShowBalance(!showBalance)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                  title={showBalance ? "Hide balance" : "Show balance"}
                >
                  {showBalance ? (
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
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
          <div className="dash-mobile-quick-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
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
              {/* PRO Seller Upgrade Banner */}
              {!user?.isPro && (
                <div className="buyer-become-seller-card animate-fade-in" style={{
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
                  border: '1.5px solid rgba(245,158,11,0.25)',
                  boxShadow: '0 8px 32px rgba(245,158,11,0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '24px',
                  borderRadius: '16px',
                  padding: '24px',
                  gap: '20px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '1.4rem' }}>👑</span>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', background: 'linear-gradient(90deg, #f59e0b, #fef08a)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Upgrade to PRO Seller
                      </h3>
                    </div>
                    <p style={{ color: 'var(--text-gray)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                      Unlock private performance analytics, dual listings (post 2 items at once), <strong>5 photos</strong> per product (vs 2 standard), and custom discount pricing banners. Up to 20 active listings. Only <strong style={{ color: '#fbbf24', textDecoration: 'line-through', marginRight: '6px' }}>₦40,000</strong> <strong style={{ color: '#34d399', fontSize: '1rem' }}>₦25,000 / 45 days</strong> promo price!
                    </p>
                  </div>
                  <button onClick={handleUpgradeToPro} className="pro-storefront-link" style={{ border: 'none', cursor: 'pointer' }}>
                    🚀 Go PRO Now
                  </button>
                </div>
              )}

              {/* Metrics */}
              <div className="dash-metrics">
                {[
                  { icon: '📦', value: activeCount, label: 'Active Listings' },
                  { icon: '🤝', value: soldCount,   label: 'Items Sold' },
                  { icon: '👜', value: wishCount,   label: 'Bag Items' },
                  { icon: '⭐', value: avgRating,   label: 'Seller Rating' },
                ].map(m => (
                  <div 
                    key={m.label} 
                    className="dash-metric"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      if (m.label === 'Active Listings') setActiveTab('listings');
                      else if (m.label === 'Items Sold') setActiveTab('orders');
                      else if (m.label === 'Bag Items') setActiveTab('wishlist');
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
                        type="text" required placeholder="Your Student Matric Number"
                        value={matricInput} onChange={e => setMatricInput(e.target.value)}
                        className="glass-input" style={{ maxWidth:'300px' }}
                      />
                      <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                        <label htmlFor="id-upload-dash" className="btn-secondary" style={{ padding:'8px 14px', fontSize:'0.82rem', cursor:'pointer' }}>
                          {idCardLabel || '📎 Upload Student ID / Matric Card'}
                        </label>
                        <input id="id-upload-dash" type="file" accept="image/*" style={{ display:'none' }}
                          onChange={e => { setIdCardFile(e.target.files[0]); setIdCardLabel(e.target.files[0]?.name || ''); }}
                        />
                        <button type="submit" className="btn-primary" style={{ padding:'8px 16px', fontSize:'0.82rem' }}>Submit Matric Details</button>
                        <button type="button" onClick={() => setShowVerifyForm(false)} className="btn-secondary" style={{ padding:'8px 14px', fontSize:'0.82rem' }}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className="dash-verify-actions">
                      <button onClick={() => setShowVerifyForm(true)} className="btn-secondary" style={{ padding:'8px 16px', fontSize:'0.82rem' }}>📎 Submit Matric Verification</button>
                      <button onClick={handlePayVerificationFee} className="btn-primary" style={{ padding:'10px 22px', fontSize:'0.85rem' }}>🎓 Instant Verification (₦1,000)</button>
                    </div>
                  )}
                  <p className="dash-verify-hint">Upload your Student ID or Matric Card to get verified and build campus trust.</p>
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
          {activeTab === 'listings' && (() => {
            // Split listings into Active (Available) and Sold
            const activeListings = myProducts.filter(p => p.status === 'Available');
            const soldListings = myProducts.filter(p => p.status === 'Sold');

            const displayedProducts = 
              subTab === 'active' ? activeListings :
              subTab === 'sold' ? soldListings : [];

            return (
              <div style={{ maxWidth: '480px', margin: '0 auto', padding: '10px 0 20px' }}>
                {/* Mockup Title */}
                <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '20px' }}>
                  My Listings
                </h2>

                {/* Sub-tabs header */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <button 
                    onClick={() => setSubTab('active')}
                    style={{
                      background: subTab === 'active' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                      color: subTab === 'active' ? 'var(--gold)' : 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '6px 16px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Active ({activeListings.length})
                  </button>
                  <button 
                    onClick={() => setSubTab('sold')}
                    style={{
                      background: subTab === 'sold' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                      color: subTab === 'sold' ? 'var(--gold)' : 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '6px 16px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Sold ({soldListings.length})
                  </button>
                  <button 
                    onClick={() => setSubTab('drafts')}
                    style={{
                      background: subTab === 'drafts' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                      color: subTab === 'drafts' ? 'var(--gold)' : 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '6px 16px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Drafts (0)
                  </button>
                </div>

                {/* Product List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                  {displayedProducts.length > 0 ? (
                    displayedProducts.map(p => {
                      // Generate semi-random mock views based on ID if not present in schema
                      const mockViews = p._id ? (p._id.toString().charCodeAt(10) % 50) + 10 : 15;

                      return (
                        <div 
                          key={p._id} 
                          style={{
                            display: 'flex',
                            gap: '16px',
                            padding: '16px',
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '16px',
                            alignItems: 'center',
                            position: 'relative'
                          }}
                        >
                          {p.image ? (
                            <img 
                              src={p.image} 
                              alt={p.name} 
                              style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border-color)' }} 
                            />
                          ) : (
                            <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                              🖼️
                            </div>
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 6px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.name}
                            </h4>
                            <div style={{ fontSize: '0.98rem', fontWeight: '800', color: 'var(--gold)', marginBottom: '8px' }}>
                              ₦{p.price.toLocaleString()}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                Views: {mockViews}
                              </span>
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                color: p.status === 'Available' ? 'var(--success)' : 'var(--text-muted)',
                                background: p.status === 'Available' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                textTransform: 'capitalize'
                              }}>
                                {p.status === 'Available' ? 'Active' : p.status}
                              </span>
                            </div>
                          </div>

                          {/* Quick Edit Overlay or Actions */}
                          <div style={{ display: 'flex', gap: '8px', marginLeft: '8px', flexDirection: 'column' }}>
                            <Link to={`/edit/${p._id}`} style={{ textDecoration: 'none', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '6px', textAlign: 'center' }}>
                              ✏️ Edit
                            </Link>
                            <button 
                              onClick={() => handleToggleSold(p._id, p.status)} 
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--gold)', textDecoration: 'underline', padding: 0 }}
                            >
                              {p.status === 'Sold' ? 'Relist' : 'Mark Sold'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                      No listings in this tab.
                    </div>
                  )}
                </div>

                {/* List New Item Button */}
                <Link 
                  to="/post" 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '14px 20px',
                    background: 'var(--gold)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    textDecoration: 'none',
                    textAlign: 'center',
                    boxShadow: '0 4px 16px rgba(59, 130, 246, 0.25)',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  className="list-new-item-btn"
                >
                  + List New Item
                </Link>
              </div>
            );
          })()}

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

          {/* ══════════ MY BAG TAB ══════════ */}
          {activeTab === 'wishlist' && (
            <>
              <div className="dash-section-header">
                <h2 className="dash-section-title">👜 My Bag <span className="dash-section-count">{wishCount}</span></h2>
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
                                showToast('Removed from Bag', 'info');
                                loadDashboard();
                              }
                            } catch {
                              showToast('Error removing item', 'error');
                            }
                          }}
                          className="btn-danger"
                          style={{ padding:'8px 12px', fontSize:'0.78rem' }}
                          title="Remove from Bag"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dash-empty">
                  <div className="dash-empty-icon">👜</div>
                  <p className="dash-empty-title">Your bag is empty</p>
                  <p className="dash-empty-sub">Browse the marketplace and add items to your bag.</p>
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


    </>
  );
}
