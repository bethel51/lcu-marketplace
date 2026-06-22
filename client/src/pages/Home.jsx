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
    const delayDebounceFn = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, hostel, faculty, minPrice, maxPrice]);

  const handleResetFilters = () => {
    setSearch('');
    setCategory('');
    setHostel('All');
    setFaculty('All');
    setMinPrice('');
    setMaxPrice('');
  };

  return (
    <div style={styles.container} className="container animate-fade-in">
      {/* Premium Hub Banner Hero */}
      <header style={styles.hero} className="glass-panel hero-card">
        <h1 style={styles.heroTitle} className="hero-title">
          LCU Student <span style={{ color: 'var(--gold)' }}>Marketplace</span>
        </h1>
        <p style={styles.heroSub}>
          The exclusive hub for Lead City University students to safely list, trade, and discover campus items.
        </p>

        {/* Search Bar Embedded in Hero for a cleaner flow */}
        <div style={styles.heroSearchContainer}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search for listings (e.g. laptop, textbooks, hostel fan...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="hero-search-input"
          />
        </div>
      </header>

      {/* Modern Layout Row: Filters Left, Main Listings Right */}
      <div className="home-layout-grid" style={{ gap: '28px' }}>
        
        {/* Left Sidebar Filter Section */}
        <aside className="filter-sidebar">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '18px' }}>
            <h3 className="filter-sidebar-title" style={{ margin: 0, border: 'none', padding: 0 }}>⚙️ Filters</h3>
            <button onClick={handleResetFilters} style={styles.resetBtn}>Reset</button>
          </div>
          
          <div style={styles.filterGroup}>
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
          {/* Category Tabs */}
          <div style={styles.categoryContainer} className="category-scroll">
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
    padding: '48px 32px',
    textAlign: 'center',
    marginBottom: '32px',
    border: '1px solid var(--border-color)',
    background: 'linear-gradient(135deg, rgba(12, 35, 64, 0.9) 0%, rgba(18, 29, 51, 0.8) 100%)',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: '2.8rem',
    marginBottom: '12px',
    fontWeight: '800',
    letterSpacing: '-0.03em',
  },
  heroSub: {
    color: 'var(--text-secondary)',
    maxWidth: '650px',
    margin: '0 auto 28px',
    fontSize: '1.05rem',
    lineHeight: '1.6',
  },
  heroSearchContainer: {
    position: 'relative',
    width: '100%',
    maxWidth: '580px',
    margin: '0 auto',
    zIndex: 2,
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '1.1rem',
    opacity: 0.7,
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  filterLabel: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
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
    color: 'var(--text-secondary)',
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
  },
  resetBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--gold)',
    fontWeight: '600',
    fontSize: '0.82rem',
    cursor: 'pointer',
    padding: '2px 8px',
    transition: 'var(--transition-smooth)',
  }
};
