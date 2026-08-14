import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { ProBadge } from './ProDashboard';
import { VerifiedBadge } from '../components/ProductCard';
import { resolveImageUrl } from '../utils/imageUrl';

// ── Status dot helper ──────────────────────────────────────────
function statusDot(s) {
  if (s === 'Reserved') return '🟡';
  if (s === 'Sold')     return '🔴';
  return '🟢';
}

// ── Discount display ───────────────────────────────────────────
function DiscountPrice({ price, originalPrice }) {
  if (!originalPrice || originalPrice <= price) {
    return <span className="storefront-price">₦{price?.toLocaleString()}</span>;
  }
  const saved = originalPrice - price;
  const pct   = Math.round((saved / originalPrice) * 100);
  return (
    <div className="storefront-price-block">
      <span className="storefront-price">₦{price?.toLocaleString()}</span>
      <span className="storefront-original-price">₦{originalPrice?.toLocaleString()}</span>
      <span className="storefront-discount-badge">{pct}% OFF</span>
    </div>
  );
}

export default function ProStorefront() {
  const { userId }   = useParams();
  const navigate     = useNavigate();
  const [seller, setSeller]     = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [category, setCategory] = useState('All');
  const [error, setError]       = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [pRes, sRes] = await Promise.all([
          fetch(`${API_URL}/api/products/storefront/${userId}`),
          fetch(`${API_URL}/api/auth/storefront/${userId}`)
        ]);
        if (!sRes.ok) { setError('Seller not found'); return; }
        const [prods, sellerData] = await Promise.all([pRes.json(), sRes.json()]);
        setProducts(Array.isArray(prods) ? prods : []);
        setSeller(sellerData);
      } catch {
        setError('Failed to load storefront');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  // Avg rating
  const avgRating = seller?.ratings?.length
    ? (seller.ratings.reduce((s, r) => s + r.rating, 0) / seller.ratings.length).toFixed(1)
    : null;

  const categories = ['All', ...new Set(products.map(p => p.category))];
  const filtered   = category === 'All' ? products : products.filter(p => p.category === category);

  if (loading) {
    return (
      <div className="pro-storefront-loading container">
        <div className="page-loader-spinner" style={{ width: 48, height: 48 }} />
        <p style={{ marginTop: 16, color: 'var(--text-gray)' }}>Loading storefront…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 24px' }}>
        <div style={{ fontSize: '3rem' }}>🏚️</div>
        <h2 style={{ marginTop: 16, color: 'var(--text-primary)' }}>{error}</h2>
        <button className="btn-secondary" onClick={() => navigate(-1)} style={{ marginTop: 16 }}>
          ← Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="pro-storefront animate-fade-in">
      {/* ── Storefront Header ───────────────────────────────── */}
      <div className="pro-storefront-header">
        <div className="pro-storefront-header-bg" />
        <div className="container pro-storefront-header-content">
          <div className="pro-storefront-avatar">
            {seller?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="pro-storefront-seller-info">
            <div className="pro-storefront-name-row">
              <h1 className="pro-storefront-seller-name">{seller?.name}'s Store</h1>
              {seller?.isPro && <ProBadge size="lg" />}
              {seller?.isVerifiedStudent && <VerifiedBadge size="lg" />}
            </div>
            <div className="pro-storefront-meta">
              {avgRating && <span>⭐ {avgRating} rating ({seller.ratings.length} reviews)</span>}
              <span>📦 {products.length} product{products.length !== 1 ? 's' : ''}</span>
              {seller?.proSince && (
                <span>🏅 PRO since {new Date(seller.proSince).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
              )}
            </div>
            {seller?.storefrontBio && (
              <p className="pro-storefront-bio">"{seller.storefrontBio}"</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Category filter ─────────────────────────────────── */}
      <div className="container">
        <div className="pro-storefront-cats">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`pro-storefront-cat-btn${category === cat ? ' active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Products grid ─────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="pro-empty-state" style={{ marginTop: 40 }}>
            <div style={{ fontSize: '3rem' }}>📦</div>
            <p>No products in this category.</p>
          </div>
        ) : (
          <div className="pro-storefront-grid">
            {filtered.map(p => {
              const imgSrc  = p.images?.[0] || p.image || '';
              const pStatus = p.productStatus || p.status || 'Available';
              return (
                <div
                  key={p._id}
                  className="pro-storefront-card premium-card"
                  onClick={() => navigate(`/product/${p._id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Image */}
                  <div className="premium-card-img-container" style={{ position: 'relative' }}>
                    {imgSrc ? (
                      <img src={resolveImageUrl(imgSrc)} alt={p.name} className="premium-card-img" loading="lazy" />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-gray)' }}>
                        📷
                      </div>
                    )}
                    {/* Overlays */}
                    <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {p.isBoosted && (
                        <span className="pro-inline-badge" style={{ background: 'rgba(251,146,60,0.9)' }}>🔥 Boosted</span>
                      )}
                      {p.isFeatured && (
                        <span className="pro-inline-badge" style={{ background: 'rgba(234,179,8,0.9)' }}>⭐ Featured</span>
                      )}
                    </div>
                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      <span className="pro-inline-badge">
                        {statusDot(pStatus)} {pStatus}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="premium-card-info">
                    <DiscountPrice price={p.price} originalPrice={p.originalPrice} />
                    <h3 className="premium-card-title">{p.name}</h3>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-gray)', marginTop: 6 }}>
                      <span>{p.category}</span>
                      {p.condition && <span style={{ marginLeft: 8 }}>• {p.condition}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>👁️ {p.views ?? 0}</span>
                      <span>❤️ {p.saves ?? 0}</span>
                    </div>
                    <button
                      className="btn-primary"
                      style={{ width: '100%', marginTop: 12, fontSize: '0.82rem', padding: '10px' }}
                      onClick={e => { e.stopPropagation(); navigate(`/product/${p._id}`); }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
