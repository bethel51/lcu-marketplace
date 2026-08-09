import React, { useEffect, useState, useMemo } from 'react';
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
  const { user, token, fetchProfile } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activeTab, setActiveTab]     = useState('overview');
  const [analytics, setAnalytics]     = useState(null);
  const [myProducts, setMyProducts]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [listingSearch, setListingSearch] = useState('');
  const [statusFilter, setStatusFilter]   = useState('All');
  const [boostingId, setBoostingId]   = useState(null);
  const [profileData, setProfileData] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const profile = await fetchProfile();
      setProfileData(profile);

      const userId = profile?._id || profile?.id || user?._id;
      if (!userId) return;

      // Load products
      const pRes = await fetch(`${API_URL}/api/products?seller=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (pRes.ok) {
        const data = await pRes.json();
        setMyProducts(Array.isArray(data) ? data : (data.products || []));
      }

      // Load analytics
      const aRes = await fetch(`${API_URL}/api/products/analytics/seller`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (aRes.ok) setAnalytics(await aRes.json());

    } catch {
      showToast('Failed to load PRO dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) loadData(); }, [token]);

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

  // ── Filtered products ────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    return myProducts.filter(p => {
      const matchSearch = listingSearch
        ? p.name.toLowerCase().includes(listingSearch.toLowerCase())
        : true;
      const matchStatus = statusFilter === 'All'
        ? true
        : (p.productStatus || p.status) === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [myProducts, listingSearch, statusFilter]);

  const activeProducts = myProducts.filter(p => p.status === 'Available');
  const soldProducts   = myProducts.filter(p => p.productStatus === 'Sold' || p.status === 'Sold');

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
          <div className="pro-hero-right">
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
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="pro-tabs">
        {[
          { key: 'overview',   label: 'Overview', icon: <HomeIcon size={14} style={{ marginRight: 6 }} />   },
          { key: 'listings',   label: 'My Products', icon: <PackageIcon size={14} style={{ marginRight: 6 }} /> },
          { key: 'analytics',  label: 'Analytics', icon: <ChartIcon size={14} style={{ marginRight: 6 }} />  },
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
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><StarIcon size={14} /> {myProducts.filter(p => p.productStatus === 'Reserved').length} reserved</span>
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
          value={status}
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
