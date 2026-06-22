import React, { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

export default function Home() {
  const { token } = useAuth();
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [hostel, setHostel] = useState('All');
  const [faculty, setFaculty] = useState('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

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
    'Off-Campus'
  ];

  const facultiesList = [
    'All',
    'Information Technology & Applied Sciences',
    'Basic Medical & Health Sciences',
    'Social & Management Sciences',
    'Arts, Education & Humanities',
    'Law'
  ];

  const getCategoryEmoji = (cat) => {
    switch (cat) {
      case 'All': return '🌐';
      case 'Hostel Items': return '🏠';
      case 'Gadgets': return '💻';
      case 'Textbooks & Handouts': return '📚';
      case 'Services': return '🛠️';
      case 'Others': return '📦';
      default: return '🏷️';
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/products?status=Available`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (hostel && hostel !== 'All') url += `&hostel=${encodeURIComponent(hostel)}`;
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
    // Debounce product fetching slightly for search and price inputs
    const delayDebounceFn = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, hostel, faculty, minPrice, maxPrice]);

  return (
    <div style={styles.container} className="container animate-fade-in">
      <div className="home-layout-grid">
        {/* Left Sidebar Filters */}
        <aside className="filter-sidebar">
          <h3 className="filter-sidebar-title">🔍 Search & Filters</h3>
          
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Search Keywords</label>
            <input
              type="text"
              placeholder="e.g. Fridge, Laptop..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input"
              style={styles.searchInput}
            />
          </div>

          <div style={{ ...styles.filterGroup, marginTop: '16px' }}>
            <label style={styles.filterLabel}>Hostel Location</label>
            <select
              value={hostel}
              onChange={(e) => setHostel(e.target.value)}
              className="glass-input"
              style={styles.select}
            >
              {hostelsList.map(h => (
                <option key={h} value={h} style={styles.option}>{h}</option>
              ))}
            </select>
          </div>

          <div style={{ ...styles.filterGroup, marginTop: '16px' }}>
            <label style={styles.filterLabel}>Faculty Location</label>
            <select
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              className="glass-input"
              style={styles.select}
            >
              {facultiesList.map(f => (
                <option key={f} value={f} style={styles.option}>{f}</option>
              ))}
            </select>
          </div>

          <div style={{ ...styles.filterGroup, marginTop: '16px' }}>
            <label style={styles.filterLabel}>Min Price (₦)</label>
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="glass-input"
              style={styles.priceInput}
            />
          </div>

          <div style={{ ...styles.filterGroup, marginTop: '12px' }}>
            <label style={styles.filterLabel}>Max Price (₦)</label>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="glass-input"
              style={styles.priceInput}
            />
          </div>
        </aside>

        {/* Right Main Content Area */}
        <div className="main-content-area">
          {/* Hero section */}
          <header style={styles.hero} className="glass-panel hero-card">
            <h1 style={styles.heroTitle} className="hero-title">
              LCU Student <span style={{ color: 'var(--gold)' }}>Marketplace</span>
            </h1>
            <p style={styles.heroSub}>
              Buy, sell, and swap gadgets, textbooks, hostel equipment, or list your student services securely.
            </p>
          </header>

          {/* Category Tabs */}
          <div style={styles.categoryContainer}>
            {categories.map((cat) => {
              const count = cat === 'All' 
                ? allProducts.length 
                : allProducts.filter(p => p.category === cat).length;
              
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat === 'All' ? '' : cat)}
                  style={{
                    ...styles.categoryTab,
                    borderBottom: (category === cat || (cat === 'All' && !category)) 
                      ? '3px solid var(--gold)' 
                      : '3px solid transparent',
                    color: (category === cat || (cat === 'All' && !category)) 
                      ? 'var(--gold)' 
                      : 'var(--text-gray)',
                  }}
                >
                  {getCategoryEmoji(cat)} {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Product Listings Feed */}
          <main style={{ marginTop: '24px', minHeight: '300px' }}>
            {loading ? (
              <div style={styles.loader}>
                <div className="spinner"></div>
                <p>Loading available listings...</p>
              </div>
            ) : (category ? allProducts.filter(p => p.category === category) : allProducts).length > 0 ? (
              <div className="grid-cols-auto">
                {(category ? allProducts.filter(p => p.category === category) : allProducts).map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            ) : (
              <div style={styles.emptyState} className="glass-panel">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--text-gray)" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <h3 style={{ marginTop: '16px', color: '#fff' }}>No Listings Found</h3>
                <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', marginTop: '6px' }}>
                  We couldn't find any products matching your current filters. Try resetting search parameters.
                </p>
              </div>
            )}
          </main>
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
  hero: {
    padding: '40px',
    textAlign: 'center',
    marginBottom: '32px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-hero-gradient)',
  },
  heroTitle: {
    fontSize: '2.5rem',
    marginBottom: '12px',
    fontWeight: '800',
  },
  heroSub: {
    color: 'var(--text-gray)',
    maxWidth: '600px',
    margin: '0 auto',
    fontSize: '1rem',
    lineHeight: '1.5',
  },
  filtersBar: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '32px',
    border: '1px solid var(--border-color)',
  },
  searchContainer: {
    width: '100%',
  },
  searchInput: {
    width: '100%',
  },
  dropdownsContainer: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  filterGroup: {
    flex: '1 1 200px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  filterLabel: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-gray)',
  },
  select: {
    width: '100%',
    cursor: 'pointer',
  },
  option: {
    background: 'var(--bg-input)',
    color: 'var(--text-white)',
  },
  categoryContainer: {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--border-color)',
  },
  categoryTab: {
    background: 'none',
    border: 'none',
    padding: '8px 16px 12px 16px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
    whiteSpace: 'nowrap',
  },
  loader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    color: 'var(--text-gray)',
    height: '200px',
  },
  emptyState: {
    padding: '48px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--border-color)',
  },
  priceInput: {
    width: '100%',
  }
};
