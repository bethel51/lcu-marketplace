import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config';
import {
  CrownIcon,
  StarIcon,
  StoreIcon,
  EyeIcon,
  BookmarkIcon,
  SendIcon,
  PackageIcon,
  PlusIcon,
  ChartIcon,
  HomeIcon,
  TrashIcon,
  EditIcon,
  ZapIcon,
  CheckCircleIcon,
  RefreshIcon,
  ImageIcon
} from '../components/Icons';

// ── Discount calculator helper ─────────────────────────────────
export function calcDiscount(price, originalPrice) {
  if (!originalPrice || originalPrice <= price) return null;
  const saved = originalPrice - price;
  const pct   = Math.round((saved / originalPrice) * 100);
  return { saved, pct };
}

// ── PRO Badge component ────────────────────────────────────────
export function ProBadge({ size = 'sm' }) {
  const isLg = size === 'lg';
  return (
    <span className="pro-badge" style={{
      fontSize: isLg ? '0.78rem' : '0.64rem',
      padding: isLg ? '5px 12px' : '3px 8px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px'
    }}>
      <StarIcon size={isLg ? 14 : 11} style={{ fill: 'currentColor' }} /> PRO
    </span>
  );
}

// ── Status pill ────────────────────────────────────────────────
function StatusPill({ status }) {
  const map = {
    Available: { label: 'Available', cls: 'status-available' },
    Reserved:  { label: 'Reserved',  cls: 'status-reserved'  },
    Sold:      { label: 'Sold',       cls: 'status-sold'      },
  };
  const s = map[status] || map['Available'];
  return <span className={`product-status-pill ${s.cls}`}>{s.label}</span>;
}

// ── Mini Stat Card ─────────────────────────────────────────────
function StatCard({ icon, label, value, color }) {
  return (
    <div className="pro-stat-card" style={{ '--stat-color': color }}>
      <div className="pro-stat-icon">{icon}</div>
      <div className="pro-stat-body">
        <div className="pro-stat-value">{value?.toLocaleString() ?? 0}</div>
        <div className="pro-stat-label">{label}</div>
      </div>
    </div>
  );
}

// ── Analytics bar chart (pure CSS) ────────────────────────────
function AnalyticsBar({ products }) {
  if (!products || products.length === 0) return null;
  const maxViews = Math.max(...products.map(p => p.views || 0), 1);
  return (
    <div className="pro-analytics-chart">
      {products.slice(0, 6).map(p => {
        const pct = Math.round(((p.views || 0) / maxViews) * 100);
        return (
          <div key={p._id} className="pro-analytics-bar-item">
            <div className="pro-analytics-bar-track">
              <div
                className="pro-analytics-bar-fill"
                style={{ height: `${Math.max(pct, 4)}%` }}
                title={`${p.views || 0} views`}
              />
            </div>
            <div className="pro-analytics-bar-label">{p.name?.split(' ')[0] ?? '—'}</div>
            <div className="pro-analytics-bar-count">{p.views || 0}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function ProDashboard() {
  const { user, token, fetchProfile, deleteAccount, verifyStudent } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activeTab, setActiveTab]     = useState('overview');
  const [analytics, setAnalytics]     = useState(null);
  const [myProducts, setMyProducts]   = useState([]);
  const [orders, setOrders]           = useState({ bought: [], sold: [] });
  const [loading, setLoading]         = useState(true);
  const [listingSearch, setListingSearch] = useState('');
  const [statusFilter, setStatusFilter]   = useState('All');
  const [boostingId, setBoostingId]   = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [showBalance, setShowBalance]   = useState(false);

  // ── Settings edit state ─────────────────────────────────────
  const [editHostel, setEditHostel]   = useState('Off-Campus');
  const [editFaculty, setEditFaculty] = useState('Information Technology & Applied Sciences');
  const [editDept, setEditDept]       = useState('');
  const [editPhone, setEditPhone]     = useState('');
  const [editSaving, setEditSaving]   = useState(false);

  // ── Verification state ──────────────────────────────────────
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [matricInput, setMatricInput]       = useState('');
  const [idCardFile, setIdCardFile]         = useState(null);
  const [idCardLabel, setIdCardLabel]       = useState('');

  const HOSTELS   = ['Bronze Hostel','Silver Hostel','Gold Hostel','Platinum Hostel','Jasper Hall','Emerald Hall','Pearl Hall','Sapphire Hall','Off-Campus'];
  const FACULTIES = ['Information Technology & Applied Sciences','Basic Medical & Health Sciences','Social & Management Sciences','Arts, Education & Humanities','Law'];
  const DEPTS_BY_FACULTY = {
    'Information Technology & Applied Sciences': ['Computer Science','Information Technology','Cyber Security','Software Engineering','Biochemistry','Industrial Chemistry','Microbiology','Physics with Electronics'],
    'Basic Medical & Health Sciences': ['Medicine & Surgery','Nursing Science','Medical Laboratory Science','Pharmacology','Physiotherapy','Public Health'],
    'Social & Management Sciences': ['Accounting','Banking & Finance','Business Administration','Economics','Mass Communication','Political Science','Sociology'],
    'Arts, Education & Humanities': ['English Language','History & International Studies','Philosophy','Education & English','Education & Mathematics'],
    'Law': ['Law'],
  };
  const currentDepts = DEPTS_BY_FACULTY[editFaculty] || [];

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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await fetchProfile();
      setProfileData(profile);
      if (profile) {
        setEditHostel(profile.hostel || 'Off-Campus');
        setEditFaculty(profile.faculty || 'Information Technology & Applied Sciences');
        setEditDept(profile.department || '');
        setEditPhone(profile.phoneNumber || '');
      }

      const userId = profile?._id || profile?.id || user?._id;
      if (!userId) return;

      // Fetch products, analytics, and orders in parallel — all cache-busted for instant updates
      const [pRes, aRes, oRes] = await Promise.all([
        fetch(`${API_URL}/api/products?seller=${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        }),
        fetch(`${API_URL}/api/products/analytics/seller`, {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        }),
        fetch(`${API_URL}/api/payments/my-orders`, {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        })
      ]);

      const [productsData, analyticsData, ordersData] = await Promise.all([
        pRes.ok ? pRes.json() : Promise.resolve(null),
        aRes.ok ? aRes.json() : Promise.resolve(null),
        oRes.ok ? oRes.json() : Promise.resolve(null),
      ]);

      if (productsData) setMyProducts(Array.isArray(productsData) ? productsData : (productsData.products || []));
      if (analyticsData) setAnalytics(analyticsData);
      if (ordersData)   setOrders(ordersData);

    } catch {
      showToast('Failed to load PRO dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, user?._id]);

  useEffect(() => { if (token) loadData(); }, [token, loadData]);

  // ── Listing actions ─────────────────────────────────────────
  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ productStatus: newStatus })
      });
      if (res.ok) { showToast(`Status updated to ${newStatus}!`, 'success'); loadData(); }
    } catch { showToast('Failed to update status', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listing permanently?')) return;
    try {
      const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { showToast('Listing deleted!', 'success'); loadData(); }
    } catch { showToast('Failed to delete', 'error'); }
  };

  const handleBoost = async (id, name) => {
    setBoostingId(id);
    try {
      const res = await fetch(`${API_URL}/api/products/${id}/boost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ hours: 24 })
      });
      const data = await res.json();
      if (res.ok) { showToast(data.message, 'success'); loadData(); }
      else showToast(data.message, 'error');
    } catch { showToast('Boost failed', 'error'); }
    finally { setBoostingId(null); }
  };

  const handleFeatureToggle = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/products/${id}/feature`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) { showToast(data.message, 'success'); loadData(); }
      else showToast(data.message, 'error');
    } catch { showToast('Failed to update featured', 'error'); }
  };

  // ── Confirm escrow delivery ──────────────────────────────────
  const handleConfirmDelivery = async (orderId) => {
    if (!window.confirm('Have you physically received the product? This will release the escrowed funds to the seller.')) return;
    try {
      const res = await fetch(`${API_URL}/api/payments/confirm-delivery/${orderId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) { showToast('Funds released to seller! 🤝', 'success'); loadData(); }
      else showToast(data.message || 'Failed to release funds', 'error');
    } catch { showToast('Error releasing funds', 'error'); }
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
      if (res.ok) { showToast('Profile updated! 🎓', 'success'); loadData(); }
      else showToast(data.message || 'Update failed', 'error');
    } catch { showToast('Error updating profile', 'error'); }
    finally { setEditSaving(false); }
  };

  // ── Student verification handlers ────────────────────────────
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!matricInput.trim()) return;
    await verifyStudent(idCardFile);
    showToast('Verification request submitted! 🎓', 'success');
    setShowVerifyForm(false);
    setMatricInput(''); setIdCardFile(null); setIdCardLabel('');
    loadData();
  };

  const handlePayVerificationFee = async () => {
    try {
      const res = await fetch(`${API_URL}/api/payments/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ orderType: 'verification' })
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.message || 'Verification init failed', 'error'); return; }
      navigate(`/checkout/${data.order._id}?amount=${data.amount}&type=verification`);
    } catch { showToast('Error initializing verification', 'error'); }
  };

  // ── Filtered products (case-insensitive status matching) ─────
  const filteredProducts = useMemo(() => {
    return myProducts.filter(p => {
      const matchSearch = listingSearch
        ? p.name.toLowerCase().includes(listingSearch.toLowerCase())
        : true;
      const pStatus = (p.productStatus || p.status || 'Available');
      const matchStatus = statusFilter === 'All'
        ? true
        : pStatus.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [myProducts, listingSearch, statusFilter]);

  const activeProducts   = myProducts.filter(p => (p.productStatus || p.status || '').toLowerCase() === 'available');
  const soldProducts     = myProducts.filter(p => (p.productStatus || p.status || '').toLowerCase() === 'sold');
  const reservedProducts = myProducts.filter(p => (p.productStatus || p.status || '').toLowerCase() === 'reserved');

  // ── Pending escrow: sold orders held but not yet released ────
  const pendingEscrow = useMemo(() =>
    (orders.sold || [])
      .filter(o => o.paymentStatus === 'Paid' && o.escrowStatus === 'Held')
      .reduce((sum, o) => sum + (o.amount || 0), 0)
  , [orders.sold]);

  // ── Average rating ───────────────────────────────────────────
  const avgRating = useMemo(() => {
    const r = profileData?.ratings || [];
    if (r.length === 0) return null;
    return (r.reduce((s, x) => s + x.rating, 0) / r.length).toFixed(1);
  }, [profileData]);

  if (loading) {
    return (
      <div className="pro-dashboard-loading">
        <div className="page-loader-spinner" style={{ width: 48, height: 48 }} />
        <p style={{ marginTop: 16, color: 'var(--text-gray)' }}>Loading PRO Dashboard…</p>
      </div>
    );
  }

  return (
    <div className="pro-dashboard container animate-fade-in">

      {/* ── PRO Hero Banner ──────────────────────────────────── */}
      <div className="pro-hero-banner">
        <div className="pro-hero-bg-orbs">
          <div className="pro-orb pro-orb-1" />
          <div className="pro-orb pro-orb-2" />
        </div>
        <div className="pro-hero-content">
          <div className="pro-hero-left">
            <div className="pro-hero-crown" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CrownIcon size={32} style={{ color: '#fbbf24', fill: 'rgba(251,191,36,0.2)' }} />
            </div>
            <div>
              <div className="pro-hero-title">LCU MARKETPLACE PRO</div>
              <div className="pro-hero-sub">
                <ProBadge size="lg" /> You're a Pro Seller
              </div>
              {avgRating && (
                <div className="pro-hero-rating" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <StarIcon size={14} style={{ fill: 'currentColor' }} /> {avgRating} rating • {profileData?.ratings?.length} reviews
                </div>
              )}
            </div>
          </div>
          <div className="pro-hero-right" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
            <Link to={`/store/${user?._id}`} className="pro-storefront-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <StoreIcon size={16} /> View My Storefront
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats Row ────────────────────────────────────────── */}
      <div className="pro-stats-row">
        <StatCard icon={<EyeIcon size={20} />} label="Total Views"    value={analytics?.totalViews}     color="#3b82f6" />
        <StatCard icon={<BookmarkIcon size={20} />} label="Total Saves"    value={analytics?.totalSaves}     color="#ec4899" />
        <StatCard icon={<SendIcon size={20} />} label="Enquiries"      value={analytics?.totalEnquiries} color="#a78bfa" />
        <StatCard icon={<PackageIcon size={20} />} label="Active Listings" value={analytics?.activeCount}   color="#10b981" />
      </div>

      {/* ── PRO Wallet Balance Card ───────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #1c1506 0%, #2d1f04 50%, #1a1200 100%)',
        border: '1.5px solid rgba(245,158,11,0.4)',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        boxShadow: '0 4px 20px rgba(245,158,11,0.12)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Available balance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: '700', color: 'rgba(251,191,36,0.65)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Available Balance</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#fbbf24', letterSpacing: '-0.02em' }}>
                {showBalance ? `₦${(profileData?.walletBalance || 0).toLocaleString()}` : '● ● ● ●'}
              </span>
              <button
                onClick={() => setShowBalance(!showBalance)}
                style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 9px', gap: '4px', fontSize: '0.72rem', fontWeight: '700' }}
              >
                {showBalance ? (
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
                {showBalance ? 'Hide' : 'Show'}
              </button>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'rgba(251,191,36,0.45)' }}>Ready to withdraw</span>
          </div>

          {/* Pending escrow */}
          {pendingEscrow > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px solid rgba(245,158,11,0.2)', paddingLeft: '24px' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: '700', color: 'rgba(251,191,36,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>In Escrow (Pending)</span>
              <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'rgba(251,191,36,0.7)' }}>
                ₦{pendingEscrow.toLocaleString()}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'rgba(251,191,36,0.35)' }}>Awaiting buyer confirmation</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('transactions')}
            style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', padding: '10px 18px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            💳 My Orders
          </button>
          <button
            onClick={() => navigate('/withdraw')}
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#1a0f00', border: 'none', padding: '10px 22px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 14px rgba(245,158,11,0.35)', whiteSpace: 'nowrap' }}
          >
            Withdraw Funds
          </button>
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <div className="pro-quick-actions">
        <button className="pro-action-btn pro-action-primary" onClick={() => navigate('/post')}>
          <span className="pro-action-icon"><PlusIcon size={16} /></span>
          <span>Add Products</span>
        </button>
        <button
          className="pro-action-btn"
          onClick={() => setActiveTab('analytics')}
        >
          <span className="pro-action-icon"><ChartIcon size={16} /></span>
          <span>Analytics</span>
        </button>
        <Link to={`/store/${user?._id}`} className="pro-action-btn">
          <span className="pro-action-icon"><StoreIcon size={16} /></span>
          <span>Storefront</span>
        </Link>
        <button className="pro-action-btn" onClick={() => setActiveTab('listings')}>
          <span className="pro-action-icon"><PackageIcon size={16} /></span>
          <span>My Listings</span>
        </button>
        <button
          className="pro-action-btn"
          onClick={() => {
            const storeUrl = `${window.location.origin}/store/${user?._id}`;
            navigator.clipboard.writeText(storeUrl);
            showToast('Store link copied to clipboard!', 'success');
          }}
        >
          <span className="pro-action-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </span>
          <span>Copy Link</span>
        </button>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="pro-tabs">
        {[
          { key: 'overview',      label: 'Overview',      icon: <HomeIcon size={14} style={{ marginRight: 6 }} /> },
          { key: 'listings',      label: 'My Products',   icon: <PackageIcon size={14} style={{ marginRight: 6 }} /> },
          { key: 'transactions',  label: 'Transactions',  icon: <CheckCircleIcon size={14} style={{ marginRight: 6 }} /> },
          { key: 'bag',           label: 'My Bag',        icon: <BookmarkIcon size={14} style={{ marginRight: 6 }} /> },
          { key: 'analytics',     label: 'Analytics',     icon: <ChartIcon size={14} style={{ marginRight: 6 }} /> },
          { key: 'settings',      label: 'Settings',      icon: <span style={{ marginRight: 6, fontSize: '0.9em' }}>⚙️</span> },
        ].map(t => (
          <button
            key={t.key}
            className={`pro-tab-btn${activeTab === t.key ? ' pro-tab-btn--active' : ''}`}
            onClick={() => setActiveTab(t.key)}
            style={{ display: 'inline-flex', alignItems: 'center' }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* OVERVIEW TAB                                           */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="pro-tab-content animate-fade-in">

          {/* Top performers */}
          <div className="pro-section-header">
            <h2 className="pro-section-title">Your Performance</h2>
          </div>

          <div className="pro-overview-grid">
            {/* Most Viewed */}
            {analytics?.mostViewed && (
              <div className="pro-insight-card">
                <div className="pro-insight-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <EyeIcon size={14} /> Most Viewed
                </div>
                <div className="pro-insight-name">{analytics.mostViewed.name}</div>
                <div className="pro-insight-stat">{analytics.mostViewed.views} views</div>
              </div>
            )}
            {/* Most Saved */}
            {analytics?.mostSaved && (
              <div className="pro-insight-card">
                <div className="pro-insight-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BookmarkIcon size={14} /> Most Saved
                </div>
                <div className="pro-insight-name">{analytics.mostSaved.name}</div>
                <div className="pro-insight-stat">{analytics.mostSaved.saves} saves</div>
              </div>
            )}
          </div>

          {/* Recent products preview */}
          <div className="pro-section-header" style={{ marginTop: 28 }}>
            <h2 className="pro-section-title">Your Products</h2>
            <button className="pro-see-all" onClick={() => setActiveTab('listings')}>
              See All →
            </button>
          </div>

          {myProducts.length === 0 ? (
            <div className="pro-empty-state">
              <div style={{ marginBottom: 12, color: 'var(--text-gray)' }}><PackageIcon size={48} /></div>
              <p>You have no listings yet.</p>
              <button className="btn-primary" onClick={() => navigate('/post')} style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <PlusIcon size={16} /> Post Your First Product
              </button>
            </div>
          ) : (
            <div className="pro-products-list">
              {myProducts.slice(0, 5).map(p => (
                <ProProductRow
                  key={p._id}
                  product={p}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  onBoost={handleBoost}
                  onFeature={handleFeatureToggle}
                  boostingId={boostingId}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* LISTINGS TAB                                           */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'listings' && (
        <div className="pro-tab-content animate-fade-in">
          <div className="pro-listings-toolbar">
            <input
              type="text"
              placeholder="Search your products…"
              value={listingSearch}
              onChange={e => setListingSearch(e.target.value)}
              className="glass-input pro-listing-search"
            />
            <div className="pro-status-filter-row">
              {['All', 'Available', 'Reserved', 'Sold'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`pro-status-filter-btn${statusFilter === s ? ' active' : ''}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="pro-listings-summary">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><PackageIcon size={14} /> {activeProducts.length} active</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><StarIcon size={14} /> {reservedProducts.length} reserved</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircleIcon size={14} /> {soldProducts.length} sold</span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="pro-empty-state">
              <p>No products match your filter.</p>
            </div>
          ) : (
            <div className="pro-products-list">
              {filteredProducts.map(p => (
                <ProProductRow
                  key={p._id}
                  product={p}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  onBoost={handleBoost}
                  onFeature={handleFeatureToggle}
                  boostingId={boostingId}
                />
              ))}
            </div>
          )}

          <button className="btn-primary" onClick={() => navigate('/post')} style={{ marginTop: 24, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <PlusIcon size={16} /> Post New Product
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ANALYTICS TAB                                          */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="pro-tab-content animate-fade-in">
          <h2 className="pro-section-title" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: '8px' }}><ChartIcon size={20} /> Listing Performance</h2>

          <div className="pro-analytics-cards">
            <div className="pro-analytics-metric">
              <div className="pro-analytics-metric-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}><EyeIcon size={16} /></div>
              <div>
                <div className="pro-analytics-metric-value">{analytics?.totalViews ?? 0}</div>
                <div className="pro-analytics-metric-label">Total Views</div>
              </div>
            </div>
            <div className="pro-analytics-metric">
              <div className="pro-analytics-metric-icon" style={{ background: 'rgba(236,72,153,0.15)', color: '#f472b6' }}><BookmarkIcon size={16} /></div>
              <div>
                <div className="pro-analytics-metric-value">{analytics?.totalSaves ?? 0}</div>
                <div className="pro-analytics-metric-label">Total Saves</div>
              </div>
            </div>
            <div className="pro-analytics-metric">
              <div className="pro-analytics-metric-icon" style={{ background: 'rgba(167,139,250,0.15)', color: '#c4b5fd' }}><SendIcon size={16} /></div>
              <div>
                <div className="pro-analytics-metric-value">{analytics?.totalEnquiries ?? 0}</div>
                <div className="pro-analytics-metric-label">Enquiries</div>
              </div>
            </div>
          </div>

          <div className="pro-chart-card glass-panel" style={{ marginTop: 24 }}>
            <div className="pro-chart-title">Views per Product</div>
            <AnalyticsBar products={analytics?.products} />
          </div>

          {/* Per-product breakdown table */}
          <div className="pro-chart-card glass-panel" style={{ marginTop: 20 }}>
            <div className="pro-chart-title">Product Breakdown</div>
            <div className="pro-analytics-table">
              <div className="pro-analytics-table-header">
                <span>Product</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><EyeIcon size={12} /> Views</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><BookmarkIcon size={12} /> Saves</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><SendIcon size={12} /> Enquiries</span>
              </div>
              {(analytics?.products || []).map(p => (
                <div key={p._id} className="pro-analytics-table-row">
                  <span className="pro-analytics-product-name">{p.name}</span>
                  <span>{p.views}</span>
                  <span>{p.saves}</span>
                  <span>{p.enquiries}</span>
                </div>
              ))}
              {(!analytics?.products || analytics.products.length === 0) && (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-gray)' }}>
                  No analytics data yet. Views and saves will appear here as buyers interact with your listings.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TRANSACTIONS TAB                                        */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'transactions' && (
        <div className="pro-tab-content animate-fade-in">
          <h2 className="pro-section-title" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>💳 Transactions</h2>

          {/* Things Sold */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fbbf24', marginBottom: 14 }}>💰 Things You Sold</h3>
            {orders.sold?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {orders.sold.map(o => (
                  <div key={o._id} style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 4 }}>{o.product ? o.product.name : 'Deleted Product'}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span>Buyer: <strong>{o.buyer?.name || 'Unknown'}</strong></span>
                          <span style={{ color: o.paymentStatus === 'Paid' ? 'var(--success)' : 'var(--warning)' }}>Payment: {o.paymentStatus}</span>
                          <span style={{ color: o.escrowStatus === 'Released' ? 'var(--success)' : o.escrowStatus === 'Held' ? '#f59e0b' : 'var(--text-muted)' }}>Escrow: {o.escrowStatus}</span>
                        </div>
                        {o.meetingPoint && (
                          <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>📍 {o.meetingPoint} · {o.pickupDate || 'Flexible'} {o.pickupTime ? `at ${o.pickupTime}` : ''}</div>
                        )}
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fbbf24' }}>₦{o.amount?.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pro-empty-state"><p>You haven't sold anything yet.</p></div>
            )}
          </div>

          {/* Things Bought */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14 }}>🛒 Things You Bought</h3>
            {orders.bought?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {orders.bought.map(o => (
                  <div key={o._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 4 }}>{o.product ? o.product.name : 'Deleted Product'}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span>Seller: <strong>{o.seller?.name || 'Unknown'}</strong></span>
                          <span style={{ color: o.paymentStatus === 'Paid' ? 'var(--success)' : 'var(--warning)' }}>Payment: {o.paymentStatus}</span>
                          <span>Escrow: {o.escrowStatus}</span>
                        </div>
                        {o.meetingPoint && (
                          <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>📍 {o.meetingPoint} · {o.pickupDate || 'Flexible'}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>₦{o.amount?.toLocaleString()}</div>
                        {o.paymentStatus === 'Paid' && o.escrowStatus === 'Held' && (
                          <button
                            onClick={() => handleConfirmDelivery(o._id)}
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 10, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
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
              <div className="pro-empty-state"><p>You haven't bought anything yet.</p></div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MY BAG TAB                                              */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'bag' && (
        <div className="pro-tab-content animate-fade-in">
          <h2 className="pro-section-title" style={{ marginBottom: 20 }}>👜 My Bag</h2>
          {profileData?.wishlist?.length > 0 ? (
            <div className="pro-products-list">
              {profileData.wishlist.map(p => (
                <div key={p._id} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, alignItems: 'center' }}>
                  {(p.images?.[0] || p.image) ? (
                    <img src={p.images?.[0] || p.image} alt={p.name} style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border-color)', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 64, height: 64, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🖼️</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.95rem' }}>₦{p.price?.toLocaleString()}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 {p.hostelLocation}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <Link to={`/product/${p._id}`} style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', padding: '7px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>💳 View</Link>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`${API_URL}/api/products/${p._id}/wishlist`, {
                            method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
                          });
                          if (res.ok) { showToast('Removed from Bag', 'info'); loadData(); }
                        } catch { showToast('Error removing item', 'error'); }
                      }}
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '7px 10px', borderRadius: 8, fontSize: '0.82rem', cursor: 'pointer' }}
                      title="Remove from Bag"
                    >🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="pro-empty-state">
              <div style={{ marginBottom: 12, fontSize: '3rem' }}>👜</div>
              <p>Your bag is empty. Browse the marketplace and save items you love.</p>
              <Link to="/marketplace" style={{ display: 'inline-block', marginTop: 12, background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', padding: '10px 22px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: '0.85rem' }}>🛍️ Browse Marketplace</Link>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SETTINGS TAB                                            */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'settings' && (
        <div className="pro-tab-content animate-fade-in">
          <h2 className="pro-section-title" style={{ marginBottom: 20 }}>⚙️ Account Settings</h2>

          {/* Profile info */}
          <div style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 16, padding: '20px 24px', marginBottom: 20 }}>
            <p style={{ fontWeight: 700, color: '#fbbf24', marginBottom: 16, fontSize: '0.95rem' }}>Profile Information</p>
            <div className="dash-settings-grid">
              <div className="dash-settings-field">
                <label className="dash-settings-label">Hostel / Location</label>
                <select value={editHostel} onChange={e => setEditHostel(e.target.value)} className="glass-input">
                  {HOSTELS.map(h => <option key={h} value={h} style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}>{h}</option>)}
                </select>
              </div>
              <div className="dash-settings-field">
                <label className="dash-settings-label">Faculty</label>
                <select value={editFaculty} onChange={e => { setEditFaculty(e.target.value); setEditDept(''); }} className="glass-input">
                  {FACULTIES.map(f => <option key={f} value={f} style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}>{f}</option>)}
                </select>
              </div>
              <div className="dash-settings-field">
                <label className="dash-settings-label">Department</label>
                <select value={editDept} onChange={e => setEditDept(e.target.value)} className="glass-input">
                  <option value="" style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}>— Select —</option>
                  {currentDepts.map(d => <option key={d} value={d} style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}>{d}</option>)}
                </select>
              </div>
              <div className="dash-settings-field">
                <label className="dash-settings-label">Phone Number</label>
                <input type="tel" maxLength="11" placeholder="e.g. 08012345678" value={editPhone} onChange={e => setEditPhone(e.target.value.replace(/\D/g, ''))} className="glass-input" />
              </div>
            </div>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleSaveSettings} disabled={editSaving} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#1a0f00', border: 'none', padding: '10px 24px', borderRadius: 10, fontSize: '0.88rem', fontWeight: 800, cursor: editSaving ? 'not-allowed' : 'pointer', opacity: editSaving ? 0.7 : 1 }}>
                {editSaving ? 'Saving…' : '💾 Save Changes'}
              </button>
            </div>
          </div>

          {/* Student Verification */}
          {!user?.isVerifiedStudent ? (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '20px 24px', marginBottom: 20 }}>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, fontSize: '0.95rem' }}>🎓 Student Verification</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>Get verified to build trust with buyers and unlock premium features.</p>
              {showVerifyForm ? (
                <form onSubmit={handleVerifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input type="text" required placeholder="Your Student Matric Number" value={matricInput} onChange={e => setMatricInput(e.target.value)} className="glass-input" style={{ maxWidth: 300 }} />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label htmlFor="pro-id-upload" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 14px', borderRadius: 8, fontSize: '0.82rem', cursor: 'pointer' }}>
                      {idCardLabel || '📎 Upload Student ID / Matric Card'}
                    </label>
                    <input id="pro-id-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { setIdCardFile(e.target.files[0]); setIdCardLabel(e.target.files[0]?.name || ''); }} />
                    <button type="submit" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#1a0f00', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>Submit</button>
                    <button type="button" onClick={() => setShowVerifyForm(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 14px', borderRadius: 8, fontSize: '0.82rem', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => setShowVerifyForm(true)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: 8, fontSize: '0.82rem', cursor: 'pointer' }}>📎 Submit Matric Form</button>
                  <button onClick={handlePayVerificationFee} style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#1a0f00', border: 'none', padding: '10px 22px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}>🎓 Instant Verified (₦1,000)</button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '1.5rem' }}>🎓</span>
              <div>
                <div style={{ fontWeight: 700, color: '#10b981', fontSize: '0.9rem' }}>LCU Student Verified</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Your account is verified as an LCU student.</div>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div style={{ marginTop: 32, border: '1px solid rgba(239,68,68,0.2)', background: 'linear-gradient(135deg, rgba(239,68,68,0.03) 0%, rgba(0,0,0,0) 100%)', borderRadius: 16, padding: 24 }}>
            <p style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px 0', fontSize: '1.05rem', fontWeight: 'bold' }}>⚠️ Danger Zone</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-gray)', marginBottom: 20, lineHeight: '1.5' }}>Once you delete your account, there is no going back. All of your products, orders, history, and profile data will be permanently removed.</p>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteSaving}
              style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 12, fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,0.25)', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {deleteSaving ? 'Deleting Account…' : '🗑️ Delete Account Permanently'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PRO Product Row Component ──────────────────────────────────
function ProProductRow({ product, onStatusChange, onDelete, onBoost, onFeature, boostingId }) {
  const navigate = useNavigate();
  const status    = product.productStatus || product.status || 'Available';
  const discount  = calcDiscount(product.price, product.originalPrice);
  const imgSrc    = product.images?.[0] || product.image || '';

  return (
    <div className={`pro-product-row${status === 'Sold' ? ' pro-product-row--sold' : ''}`}>
      {/* Thumbnail */}
      <div className="pro-product-thumb">
        {imgSrc ? (
          <img src={imgSrc} alt={product.name} className="pro-product-thumb-img" />
        ) : (
          <div className="pro-product-thumb-placeholder"><ImageIcon size={20} /></div>
        )}
        {product.isBoosted && (
          <div className="pro-product-boost-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><ZapIcon size={10} style={{ fill: 'currentColor' }} /> Boosted</div>
        )}
        {product.isFeatured && (
          <div className="pro-product-featured-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><StarIcon size={10} style={{ fill: 'currentColor' }} /> Featured</div>
        )}
      </div>

      {/* Info */}
      <div className="pro-product-info">
        <div className="pro-product-name">{product.name}</div>

        {/* Price display */}
        <div className="pro-product-price-row">
          <span className="pro-product-price">₦{product.price?.toLocaleString()}</span>
          {discount && (
            <>
              <span className="pro-product-original-price">₦{product.originalPrice?.toLocaleString()}</span>
              <span className="pro-product-discount-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><ZapIcon size={10} style={{ fill: 'currentColor' }} /> {discount.pct}% OFF</span>
            </>
          )}
        </div>

        {/* Status pill + analytics */}
        <div className="pro-product-meta">
          <StatusPill status={status} />
          <span className="pro-product-analytics-mini" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <EyeIcon size={12} /> {product.views ?? 0} · <BookmarkIcon size={12} /> {product.saves ?? 0} · <SendIcon size={12} /> {product.enquiries ?? 0}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="pro-product-actions">
        {/* Status changer */}
        <select
          value={status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
          onChange={e => onStatusChange(product._id, e.target.value)}
          className="pro-status-select"
          disabled={boostingId === product._id}
        >
          <option value="Available">Available</option>
          <option value="Reserved">Reserved</option>
          <option value="Sold">Sold</option>
        </select>

        <div className="pro-product-btns">
          <button
            className="pro-btn-icon"
            title="Edit"
            onClick={() => navigate(`/edit/${product._id}`)}
          >
            <EditIcon size={14} />
          </button>

          <button
            className={`pro-btn-icon${product.isFeatured ? ' active' : ''}`}
            title={product.isFeatured ? 'Unfeature' : 'Feature this listing'}
            onClick={() => onFeature(product._id)}
          >
            <StarIcon size={14} style={product.isFeatured ? { fill: 'currentColor' } : {}} />
          </button>

          <button
            className="pro-btn-icon"
            title="Boost for 24hrs"
            onClick={() => onBoost(product._id, product.name)}
            disabled={product.isBoosted || boostingId === product._id}
          >
            {boostingId === product._id ? <RefreshIcon size={14} className="animate-spin" /> : <ZapIcon size={14} />}
          </button>

          <button
            className="pro-btn-icon pro-btn-danger"
            title="Delete"
            onClick={() => onDelete(product._id)}
          >
            <TrashIcon size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
