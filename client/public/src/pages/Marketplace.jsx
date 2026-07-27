import React, { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

export default function Marketplace() {
  const { token, user } = useAuth();
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [hostel, setHostel] = useState('All');
  const [faculty, setFaculty] = useState('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const categories = ['All', 'Hostel Items', 'Gadgets', 'Textbooks & Handouts', 'Services', 'Others'];

  const hostelsList = [
    'All',
    'Bronze Hostel',
    'Silver Hostel',
    'Gold Hostel',
    'Platinum Hostel',
    'Jasper Hall',
    'Emerald Hall',
    'Pearl Hall',
    'Sapphire Hall',
    'Off-Campus',
  ];

  const facultiesList = [
    'All',
    'Information Technology & Applied Sciences',
    'Basic Medical & Health Sciences',
    'Social & Management Sciences',
    'Arts, Education & Humanities',
    'Law',
  ];

  const getCategoryEmoji = (cat) => {
    switch (cat) {
      case 'All':                   return '🌐';
      case 'Hostel Items':          return '🏠';
      case 'Gadgets':               return '💻';
      case 'Textbooks & Handouts':  return '📚';
      case 'Services':              return '🛠️';
      case 'Others':                return '📦';
      default:                      return '🏷️';
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/products?status=Available`;
      if (search)  url += `&search=${encodeURIComponent(search)}`;
      if (hostel  && hostel  !== 'All') url += `&hostel=${encodeURIComponent(hostel)}`;
      if (faculty && faculty !== 'All') url += `&faculty=${encodeURIComponent(faculty)}`;
      if (minPrice) url += `&minPrice=${encodeURIComponent(minPrice)}`;
      if (maxPrice) url += `&maxPrice=${encodeURIComponent(maxPrice)}`;

      const response = await fetch(url);
      const data = await response.json();
      if (response.ok) {
        const activeAndSafe = data.filter(p => !p.reports || p.reports.length <= 2);
        setAllProducts(activeAndSafe);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => fetchProducts(), 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search, hostel, faculty, minPrice, maxPrice]);

  const filteredProducts = category
    ? allProducts.filter(p => p.category === category)
    : allProducts;

  const sortedProducts = React.useMemo(() => {
    if (!user?.hostel) return filteredProducts;
    const userHostelLower = user.hostel.toLowerCase().trim();
    return [...filteredProducts].sort((a, b) => {
      const aMatch = a.hostelLocation?.toLowerCase().trim() === userHostelLower;
      const bMatch = b.hostelLocation?.toLowerCase().trim() === userHostelLower;
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  }, [filteredProducts, user?.hostel]);

  const hasActiveFilters = search || hostel !== 'All' || faculty !== 'All' || minPrice || maxPrice;

  const clearFilters = () => {
    setSearch('');
    setHostel('All');
    setFaculty('All');
    setMinPrice('');
    setMaxPrice('');
    setCategory('');
  };

  return (
    <div className="marketplace-page container animate-fade-in">

      {/* ─── Page Header ──────────────────────────────────────── */}
      <header className="mkt-header">
        <div className="mkt-header-text">
          <h1 className="mkt-title">
            Student <span style={{ color: 'var(--gold)' }}>Marketplace</span>
          </h1>
          <p className="mkt-subtitle">
            Browse listings from verified LCU students — gadgets, textbooks, hostel items &amp; more.
          </p>
        </div>

        {/* Mobile filter toggle */}
        <button
          className="mkt-filter-toggle btn-secondary"
          onClick={() => setFiltersOpen(o => !o)}
          aria-label="Toggle filters"
        >
          {filtersOpen ? '✕ Close' : '⚙ Filters'}
          {hasActiveFilters && <span className="mkt-filter-dot" />}
        </button>
      </header>

      {/* ─── Search Bar ───────────────────────────────────────── */}
      <div className="mkt-search-row">
        <div className="mkt-search-wrap">
          <svg className="mkt-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="marketplace-search"
            type="text"
            placeholder="Search listings… (e.g. Laptop, Fridge, Physics textbook)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="glass-input mkt-search-input"
          />
          {search && (
            <button className="mkt-search-clear" onClick={() => setSearch('')} aria-label="Clear search">✕</button>
          )}
        </div>
      </div>

      {/* ─── Expandable Filters ───────────────────────────────── */}
      <div className={`mkt-filters-panel glass-panel${filtersOpen ? ' mkt-filters-open' : ''}`}>
        <div className="mkt-filters-grid">
          <div className="mkt-filter-group">
            <label className="mkt-filter-label">Hostel Location</label>
            <select
              value={hostel}
              onChange={e => setHostel(e.target.value)}
              className="glass-input"
            >
              {hostelsList.map(h => (
                <option key={h} value={h} style={{ background: 'var(--bg-input)' }}>{h}</option>
              ))}
            </select>
          </div>
          <div className="mkt-filter-group">
            <label className="mkt-filter-label">Faculty</label>
            <select
              value={faculty}
              onChange={e => setFaculty(e.target.value)}
              className="glass-input"
            >
              {facultiesList.map(f => (
                <option key={f} value={f} style={{ background: 'var(--bg-input)' }}>{f}</option>
              ))}
            </select>
          </div>
          <div className="mkt-filter-group">
            <label className="mkt-filter-label">Min Price (₦)</label>
            <input
              type="number"
              placeholder="0"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              className="glass-input"
            />
          </div>
          <div className="mkt-filter-group">
            <label className="mkt-filter-label">Max Price (₦)</label>
            <input
              type="number"
              placeholder="Any"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              className="glass-input"
            />
          </div>
        </div>
        {hasActiveFilters && (
          <button className="mkt-clear-btn btn-secondary" onClick={clearFilters}>
            Clear All Filters
          </button>
        )}
      </div>

      {/* ─── Category Tabs ────────────────────────────────────── */}
      <div className="mkt-cat-tabs category-scroll">
        {categories.map(cat => {
          const count = cat === 'All'
            ? allProducts.length
            : allProducts.filter(p => p.category === cat).length;
          const isActive = category === cat || (cat === 'All' && !category);
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat === 'All' ? '' : cat)}
              className={`mkt-cat-btn${isActive ? ' mkt-cat-btn--active' : ''}`}
            >
              {getCategoryEmoji(cat)} {cat}
              <span className="mkt-cat-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Results Row ──────────────────────────────────────── */}
      <div className="mkt-results-row">
        <span className="mkt-results-count">
          {loading ? 'Loading…' : `${sortedProducts.length} listing${sortedProducts.length !== 1 ? 's' : ''} found`}
        </span>
      </div>

      {/* ─── Product Grid ─────────────────────────────────────── */}
      <main className="mkt-grid-area">
        {loading ? (
          <div className="mkt-loader">
            <div className="spinner" />
            <p>Loading available listings…</p>
          </div>
        ) : sortedProducts.length > 0 ? (
          <div className="grid-cols-auto">
            {sortedProducts.map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mkt-empty glass-panel">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-gray)" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <h3 className="mkt-empty-title">No Listings Found</h3>
            <p className="mkt-empty-sub">
              No products match your current filters. Try adjusting or clearing your search.
            </p>
            {hasActiveFilters && (
              <button className="btn-primary" style={{ marginTop: '16px' }} onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        )}
      </main>

    </div>
  );
}
