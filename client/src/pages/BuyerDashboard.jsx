import React, { useEffect, useState } from 'react';
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

export default function BuyerDashboard() {
  const { user, token, fetchProfile, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [profileData, setProfileData]     = useState(null);
  const [loading, setLoading]             = useState(true);
  const [activeTab, setActiveTab]         = useState('overview');
  const [orders, setOrders]               = useState({ bought: [], sold: [] });
  const [wishlistItems, setWishlistItems] = useState([]);

  const [readCounts, setReadCounts] = useState(() => ({
    purchases: parseInt(localStorage.getItem('lcu_read_purchases_count') ?? '-1'),
    wishlist: parseInt(localStorage.getItem('lcu_read_wishlist_count') ?? '-1'),
  }));

  const [editHostel,   setEditHostel]   = useState('Off-Campus');
  const [editFaculty,  setEditFaculty]  = useState(FACULTIES[0]);
  const [editDept,     setEditDept]     = useState('');
  const [editPhone,    setEditPhone]    = useState('');
  const [editSaving,   setEditSaving]   = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const currentDepts = DEPTS_BY_FACULTY[editFaculty] || [];

  const handleDeleteAccount = async () => {
    const first = window.confirm('WARNING: Are you absolutely sure you want to permanently delete your account?\n\nThis action CANNOT be undone.');
    if (!first) return;
    const second = window.confirm('FINAL CONFIRMATION: Click OK to permanently delete your account and all data.');
    if (!second) return;
    setDeleteSaving(true);
    try {
      await deleteAccount();
      showToast('Account permanently deleted. Goodbye!', 'info');
      navigate('/');
    } catch (err) {
      showToast(err.message || 'Failed to delete account', 'error');
    } finally {
      setDeleteSaving(false);
    }
  };

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

      const ordersRes = await fetch(`${API_URL}/api/payments/my-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
      }

      const wishRes = await fetch(`${API_URL}/api/products/wishlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (wishRes.ok) {
        const wishData = await wishRes.json();
        setWishlistItems(Array.isArray(wishData) ? wishData : []);
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
    if (purchaseCount > 0 && readCounts.purchases === -1) {
      localStorage.setItem('lcu_read_purchases_count', purchaseCount);
      setReadCounts(prev => ({ ...prev, purchases: purchaseCount }));
    }
  }, [purchaseCount, readCounts.purchases]);

  useEffect(() => {
    if (wishCount > 0 && readCounts.wishlist === -1) {
      localStorage.setItem('lcu_read_wishlist_count', wishCount);
      setReadCounts(prev => ({ ...prev, wishlist: wishCount }));
    }
  }, [wishCount, readCounts.wishlist]);

  // Keep read counts synced when tabs are open
  useEffect(() => {
    if (activeTab === 'purchases') {
      localStorage.setItem('lcu_read_purchases_count', purchaseCount);
      setReadCounts(prev => ({ ...prev, purchases: purchaseCount }));
    } else if (activeTab === 'wishlist') {
      localStorage.setItem('lcu_read_wishlist_count', wishCount);
      setReadCounts(prev => ({ ...prev, wishlist: wishCount }));
    }
  }, [activeTab, purchaseCount, wishCount]);

  const handleRemoveWishlist = async (productId) => {
    try {
      await fetch(`${API_URL}/api/products/${productId}/wishlist`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setWishlistItems(prev => prev.filter(p => p._id !== productId));
      showToast('Removed from Bag', 'info');
    } catch {
      showToast('Failed to remove from Bag', 'error');
    }
  };

  const handleConfirmDelivery = async (orderId) => {
    try {
      const res = await fetch(`${API_URL}/api/payments/confirm-delivery/${orderId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Delivery confirmed! Funds released to seller. 🎉', 'success');
        loadDashboard();
      } else {
        showToast(data.message || 'Failed to confirm delivery', 'error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    }
  };

  const handleSaveSettings = async () => {
    if (!token) return;
    setEditSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
      showToast('Network error', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const purchaseCount = orders.bought?.length || 0;
  const totalSpent    = (orders.bought || []).reduce((s, o) => s + (o.amount || 0), 0);
  const wishCount     = wishlistItems.length;
  const pendingOrders = (orders.bought || []).filter(o => o.escrowStatus === 'Held').length;

  const navTabs = [
    { id: 'overview',  icon: '📊', label: 'Overview' },
    { id: 'purchases', icon: '🛒', label: 'Purchases', badge: Math.max(0, purchaseCount - (readCounts.purchases === -1 ? purchaseCount : readCounts.purchases)) },
    { id: 'wishlist',  icon: '👜', label: 'My Bag',    badge: Math.max(0, wishCount - (readCounts.wishlist === -1 ? wishCount : readCounts.wishlist)) },
    { id: 'settings',  icon: '⚙️', label: 'Settings' },
  ];

  if (loading) return (
    <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }} className="container">
      <div style={{ width: '44px', height: '44px', border: '4px solid var(--border-color)', borderTop: '4px solid var(--gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading your dashboard…</p>
    </div>
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="buyer-dash-root">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="buyer-dash-sidebar">
        <div className="buyer-dash-sidebar-inner">

          <div className="buyer-dash-avatar-wrap">
            <div className="buyer-dash-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || 'B'}
            </div>
            <div className="buyer-dash-avatar-info">
              <span className="buyer-dash-avatar-name">{user?.name || 'Buyer'}</span>
              <span className="buyer-dash-avatar-role">🛍️ Buyer Account</span>
            </div>
          </div>

          {user?.isVerifiedStudent && (
            <div style={{ margin: '0 0 16px 0' }}>
              <VerifiedBadge size="sm" />
            </div>
          )}

          <nav className="buyer-dash-nav">
            {navTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`buyer-dash-nav-btn${activeTab === tab.id ? ' active' : ''}`}
              >
                <span className="buyer-dash-nav-icon">{tab.icon}</span>
                <span className="buyer-dash-nav-label">{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="buyer-dash-nav-badge">{tab.badge}</span>
                )}
              </button>
            ))}
          </nav>

          <div className="buyer-dash-quick">
            <p className="buyer-dash-quick-title">Quick Access</p>
            <Link to="/marketplace" className="buyer-dash-quick-btn">🏪 Browse Marketplace</Link>
            <Link to="/marketplace?category=Electronics" className="buyer-dash-quick-btn">📱 Electronics</Link>
            <Link to="/marketplace?category=Books" className="buyer-dash-quick-btn">📚 Textbooks</Link>
            <Link to="/marketplace?category=Clothing%20%26%20Fashion" className="buyer-dash-quick-btn">👗 Clothing & Fashion</Link>
          </div>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="buyer-dash-main">

        {/* Mobile Tabs */}
        <div className="buyer-dash-mobile-tabs">
          {navTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`buyer-dash-mobile-tab${activeTab === tab.id ? ' active' : ''}`}
            >
              <span>{tab.icon}</span>
              <span className="buyer-dash-mobile-tab-label">{tab.label}</span>
              {tab.badge > 0 && <span className="buyer-dash-mobile-badge">{tab.badge}</span>}
            </button>
          ))}
        </div>

        {/* ══════════════════ TAB: OVERVIEW ══════════════════ */}
        {activeTab === 'overview' && (
          <div className="buyer-dash-content animate-fade-in">

            <div className="buyer-dash-greeting">
              <div>
                <h1 className="buyer-dash-greeting-title">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
                <p className="buyer-dash-greeting-sub">Here's a snapshot of your shopping activity on LCU Marketplace</p>
              </div>
              <Link to="/marketplace" className="btn-primary buyer-dash-browse-btn">🏪 Browse Now</Link>
            </div>

            {/* Metrics */}
            <div className="buyer-dash-metrics">
              {[
                { icon: '🛒', label: 'Total Purchases', value: purchaseCount,                    color: 'var(--metric-1-color)', bg: 'var(--metric-1-bg)', border: 'var(--metric-1-border)', tab: 'purchases' },
                { icon: '💸', label: 'Total Spent',     value: `₦${totalSpent.toLocaleString()}`, color: 'var(--metric-2-color)', bg: 'var(--metric-2-bg)', border: 'var(--metric-2-border)', tab: null },
                { icon: '👜', label: 'Bag Items',      value: wishCount,                         color: 'var(--metric-3-color)', bg: 'var(--metric-3-bg)', border: 'var(--metric-3-border)', tab: 'wishlist' },
                { icon: '⏳', label: 'Pending Deliveries', value: pendingOrders,                  color: 'var(--metric-4-color)', bg: 'var(--metric-4-bg)', border: 'var(--metric-4-border)', tab: 'purchases' },
              ].map(m => (
                <div
                  key={m.label}
                  className="buyer-dash-metric"
                  style={{ borderColor: m.border, background: m.bg, cursor: m.tab ? 'pointer' : 'default' }}
                  onClick={() => m.tab && setActiveTab(m.tab)}
                >
                  <div className="buyer-dash-metric-icon" style={{ color: m.color }}>{m.icon}</div>
                  <div className="buyer-dash-metric-value" style={{ color: m.color }}>{m.value}</div>
                  <div className="buyer-dash-metric-label">{m.label}</div>
                </div>
              ))}
            </div>

            {/* Verification prompt */}
            {!user?.isVerifiedStudent && (
              <div className="buyer-verify-prompt">
                <div style={{ fontSize: '2rem' }}>🎓</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '4px', color: 'var(--text-primary)' }}>Get Verified as an LCU Student</h3>
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', margin: 0 }}>Verified buyers get priority access to new listings and exclusive campus deals.</p>
                </div>
                <button onClick={() => setActiveTab('settings')} className="btn-primary" style={{ flexShrink: 0, padding: '8px 18px', fontSize: '0.82rem' }}>
                  Verify Now
                </button>
              </div>
            )}

            {/* Profile Info */}
            <div className="buyer-dash-section-header">
              <h2 className="buyer-dash-section-title">👤 Profile Summary</h2>
              <button onClick={() => setActiveTab('settings')} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>Edit →</button>
            </div>
            <div className="buyer-dash-profile-grid">
              {[
                { icon: '🪪', label: 'Matric No.',  value: profileData?.matricNumber || '—' },
                { icon: '🏛️', label: 'Faculty',     value: profileData?.faculty || '—' },
                { icon: '📚', label: 'Department',  value: profileData?.department || '—' },
                { icon: '🏠', label: 'Hostel',      value: profileData?.hostel || '—' },
                { icon: '📞', label: 'Phone',       value: profileData?.phoneNumber || '—' },
                { icon: '📧', label: 'Email',       value: user?.email || '—' },
              ].map(row => (
                <div key={row.label} className="buyer-dash-profile-item">
                  <span className="buyer-dash-profile-label">{row.icon} {row.label}</span>
                  <span className="buyer-dash-profile-value">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Recent Purchases */}
            <div className="buyer-dash-section-header" style={{ marginTop: '28px' }}>
              <h2 className="buyer-dash-section-title">🛒 Recent Purchases</h2>
              <button onClick={() => setActiveTab('purchases')} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>View All →</button>
            </div>
            {orders.bought && orders.bought.length > 0 ? (
              <div className="buyer-dash-orders-list">
                {orders.bought.slice(0, 3).map(o => (
                  <div key={o._id} className="buyer-dash-order-card">
                    <div className="buyer-dash-order-left">
                      {o.product?.image
                        ? <img src={o.product.image} alt={o.product?.name} className="buyer-dash-order-img" />
                        : <div className="buyer-dash-order-img-placeholder">🛍️</div>
                      }
                      <div className="buyer-dash-order-info">
                        <h4 className="buyer-dash-order-name">{o.product?.name || 'Deleted Product'}</h4>
                        <div className="buyer-dash-order-meta">
                          <span>₦{o.amount?.toLocaleString()}</span>
                          <span>· {o.seller?.name || 'Unknown seller'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="buyer-dash-order-right">
                      <span className={`buyer-status-pill ${o.paymentStatus === 'Paid' ? 'success' : 'warning'}`}>
                        {o.paymentStatus}
                      </span>
                      {o.paymentStatus === 'Paid' && o.escrowStatus === 'Held' && (
                        <button
                          onClick={() => handleConfirmDelivery(o._id)}
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >
                          🤝 Confirm Delivery
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="buyer-dash-empty">
                <div className="buyer-dash-empty-icon">🛒</div>
                <p>No purchases yet.</p>
                <Link to="/marketplace" className="btn-primary" style={{ marginTop: '12px', padding: '10px 24px' }}>Browse Marketplace</Link>
              </div>
            )}

            {/* Wishlist Preview */}
            {wishlistItems.length > 0 && (
              <>
                <div className="buyer-dash-section-header" style={{ marginTop: '28px' }}>
                  <h2 className="buyer-dash-section-title">👜 Saved Items</h2>
                  <button onClick={() => setActiveTab('wishlist')} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>View All →</button>
                </div>
                <div className="buyer-dash-wishlist-grid">
                  {wishlistItems.slice(0, 4).map(p => (
                    <Link key={p._id} to={`/product/${p._id}`} className="buyer-wish-card">
                      {p.image
                        ? <img src={p.image} alt={p.name} className="buyer-wish-img" />
                        : <div className="buyer-wish-img-placeholder">🖼️</div>
                      }
                      <div className="buyer-wish-info">
                        <h4 className="buyer-wish-name">{p.name}</h4>
                        <span className="buyer-wish-price">₦{p.price?.toLocaleString()}</span>
                      </div>
                    </Link>
                  ))}
            {/* Quick Access — Mobile only */}
            <div className="buyer-dash-quick mobile-only-quick" style={{ marginTop: '32px' }}>
              <p className="buyer-dash-quick-title">⚡ Quick Access</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Link to="/marketplace" className="buyer-dash-quick-btn" style={{ margin: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>🏪 Marketplace</Link>
                <Link to="/marketplace?category=Gadgets" className="buyer-dash-quick-btn" style={{ margin: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>💻 Gadgets</Link>
                <Link to="/marketplace?category=Textbooks%20%26%20Handouts" className="buyer-dash-quick-btn" style={{ margin: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>📚 Textbooks</Link>
                <Link to="/marketplace?category=Clothing%20%26%20Fashion" className="buyer-dash-quick-btn" style={{ margin: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>👗 Fashion</Link>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ TAB: PURCHASES ══════════════════ */}
        {activeTab === 'purchases' && (
          <div className="buyer-dash-content animate-fade-in">
            <div className="buyer-dash-section-header">
              <h2 className="buyer-dash-section-title">🛒 My Purchases</h2>
              <span className="buyer-dash-count-badge">{purchaseCount} item{purchaseCount !== 1 ? 's' : ''}</span>
            </div>

            {orders.bought && orders.bought.length > 0 ? (
              <div className="buyer-dash-orders-list">
                {orders.bought.map(o => (
                  <div key={o._id} className="buyer-dash-order-card buyer-dash-order-card--full">
                    <div className="buyer-dash-order-left">
                      {o.product?.image
                        ? <img src={o.product.image} alt={o.product?.name} className="buyer-dash-order-img" />
                        : <div className="buyer-dash-order-img-placeholder">🛍️</div>
                      }
                      <div className="buyer-dash-order-info">
                        <h4 className="buyer-dash-order-name">{o.product?.name || 'Deleted Product'}</h4>
                        <div className="buyer-dash-order-meta">
                          <span>Amount: <strong style={{ color: 'var(--gold)' }}>₦{o.amount?.toLocaleString()}</strong></span>
                          <span>Seller: <strong>{o.seller?.name || 'Unknown'}</strong></span>
                          <span>Date: {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</span>
                        </div>
                        {o.escrowStatus && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Escrow: <strong style={{ color: o.escrowStatus === 'Released' ? 'var(--success)' : 'var(--warning)' }}>
                              {o.escrowStatus}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="buyer-dash-order-right">
                      <span className={`buyer-status-pill ${o.paymentStatus === 'Paid' ? 'success' : 'warning'}`}>
                        {o.paymentStatus}
                      </span>
                      {o.paymentStatus === 'Paid' && o.escrowStatus === 'Held' && (
                        <button
                          onClick={() => handleConfirmDelivery(o._id)}
                          className="btn-primary"
                          style={{ padding: '8px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap', marginTop: '8px' }}
                        >
                          🤝 Confirm & Release
                        </button>
                      )}
                      {o.product?._id && (
                        <Link
                          to={`/product/${o.product._id}`}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap', marginTop: '6px', textAlign: 'center', display: 'block' }}
                        >
                          View Item →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="buyer-dash-empty">
                <div className="buyer-dash-empty-icon">🛒</div>
                <p>No purchases yet.</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>Browse the marketplace and find great deals from fellow LCU students.</p>
                <Link to="/marketplace" className="btn-primary" style={{ marginTop: '16px', padding: '12px 28px' }}>Start Shopping</Link>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ TAB: MY BAG ══════════════════ */}
        {activeTab === 'wishlist' && (
          <div className="buyer-dash-content animate-fade-in">
            <div className="buyer-dash-section-header">
              <h2 className="buyer-dash-section-title">👜 My Bag</h2>
              <span className="buyer-dash-count-badge">{wishCount} item{wishCount !== 1 ? 's' : ''}</span>
            </div>

            {wishlistItems.length > 0 ? (
              <div className="buyer-full-wishlist-grid">
                {wishlistItems.map(p => (
                  <div key={p._id} className="buyer-full-wish-card">
                    <Link to={`/product/${p._id}`} className="buyer-full-wish-img-wrap">
                      {p.image
                        ? <img src={p.image} alt={p.name} className="buyer-full-wish-img" />
                        : <div className="buyer-full-wish-placeholder">🖼️</div>
                      }
                      <div className="buyer-full-wish-overlay"><span>View →</span></div>
                    </Link>
                    <div className="buyer-full-wish-body">
                      <h4 className="buyer-full-wish-name">{p.name}</h4>
                      <div className="buyer-full-wish-details">
                        <span className="buyer-full-wish-price">₦{p.price?.toLocaleString()}</span>
                        <span className="buyer-full-wish-cond">{p.condition}</span>
                      </div>
                      <div className="buyer-full-wish-location">📍 {p.hostelLocation}</div>
                      <div className="buyer-full-wish-actions">
                        <Link to={`/product/${p._id}`} className="btn-primary" style={{ flex: 1, textAlign: 'center', padding: '8px 12px', fontSize: '0.82rem' }}>
                          View Item
                        </Link>
                        <button
                          onClick={() => handleRemoveWishlist(p._id)}
                          className="btn-secondary"
                          style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                          title="Remove from Bag"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="buyer-dash-empty">
                <div className="buyer-dash-empty-icon">👜</div>
                <p>Your bag is empty.</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>Add items from the marketplace to your bag and never miss a deal.</p>
                <Link to="/marketplace" className="btn-primary" style={{ marginTop: '16px', padding: '12px 28px' }}>Explore Listings</Link>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ TAB: SETTINGS ══════════════════ */}
        {activeTab === 'settings' && (
          <div className="buyer-dash-content animate-fade-in">
            <div className="buyer-dash-section-header">
              <h2 className="buyer-dash-section-title">⚙️ Account Settings</h2>
            </div>

            {/* Edit Profile */}
            <div className="buyer-settings-card glass-panel">
              <h3 className="buyer-settings-title">📝 Edit Profile</h3>
              <div className="buyer-settings-grid">
                <div className="buyer-settings-field">
                  <label className="buyer-settings-label">Hostel / Location</label>
                  <select value={editHostel} onChange={e => setEditHostel(e.target.value)} className="glass-input">
                    {HOSTELS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="buyer-settings-field">
                  <label className="buyer-settings-label">Faculty</label>
                  <select value={editFaculty} onChange={e => { setEditFaculty(e.target.value); setEditDept(''); }} className="glass-input">
                    {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="buyer-settings-field">
                  <label className="buyer-settings-label">Department</label>
                  <select value={editDept} onChange={e => setEditDept(e.target.value)} className="glass-input">
                    <option value="">-- Select Department --</option>
                    {currentDepts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="buyer-settings-field">
                  <label className="buyer-settings-label">Phone Number</label>
                  <input
                    type="tel" maxLength="11" placeholder="08012345678"
                    value={editPhone} onChange={e => setEditPhone(e.target.value.replace(/\D/g, ''))}
                    className="glass-input"
                  />
                </div>
              </div>
              <button onClick={handleSaveSettings} disabled={editSaving} className="btn-primary" style={{ marginTop: '16px' }}>
                {editSaving ? 'Saving…' : '💾 Save Changes'}
              </button>
            </div>

            {/* Become a Seller CTA */}
            <div className="buyer-become-seller-card glass-panel" style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '2.5rem' }}>🏪</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '4px', color: 'var(--text-primary)' }}>Want to start selling?</h3>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', margin: 0 }}>
                  List your items on LCU Marketplace and earn money from fellow students. Switch to a Seller account to get started.
                </p>
              </div>
              <button
                className="btn-secondary"
                onClick={() => showToast('To switch to a Seller account, please register a new Seller account or contact admin support.', 'info')}
                style={{ flexShrink: 0, padding: '10px 20px', fontSize: '0.85rem' }}
              >
                Learn More →
              </button>
            </div>

            {/* Danger Zone */}
            <div className="buyer-danger-card glass-panel" style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--error)', marginBottom: '8px' }}>⚠️ Danger Zone</h3>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Permanently delete your account and all associated data. This cannot be undone.
              </p>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteSaving}
                className="btn-danger"
              >
                {deleteSaving ? 'Deleting…' : '🗑️ Delete My Account'}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
