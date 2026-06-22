import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config';

export default function Dashboard() {
  const { user, token, fetchProfile, verifyStudent } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [profileData, setProfileData] = useState(null);
  const [myProducts, setMyProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Profile edit states
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editHostel, setEditHostel] = useState('');
  const [editFaculty, setEditFaculty] = useState('');

  const hostelsList = [
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
    'Information Technology & Applied Sciences',
    'Basic Medical & Health Sciences',
    'Social & Management Sciences',
    'Arts, Education & Humanities',
    'Law'
  ];
  
  // Verification states
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [matricNumber, setMatricNumber] = useState('');
  const [idCardImage, setIdCardImage] = useState('');
  const [idCardFile, setIdCardFile] = useState(null);
  
  const [activeTab, setActiveTab] = useState('listings'); // 'listings' or 'wishlist'

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch user profile (wishlist details included)
      const profile = await fetchProfile();
      if (profile) {
        setProfileData(profile);
        setEditHostel(profile.hostel || 'Off-Campus');
        setEditFaculty(profile.faculty || 'Basic Medical & Health Sciences');
      }
      
      // 2. Fetch products created by this user
      if (user?._id) {
        const response = await fetch(`${API_URL}/api/products?status=All`);
        if (response.ok) {
          const allProducts = await response.json();
          const filtered = allProducts.filter(p => p.seller?._id === user._id || p.seller === user._id);
          setMyProducts(filtered);
        }
      }
    } catch (err) {
      setError('Failed to fetch dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token]);

  const handleSaveProfile = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          hostel: editHostel,
          faculty: editFaculty
        })
      });
      const data = await response.json();
      if (response.ok) {
        showToast('Profile updated successfully! 🎓', 'success');
        setIsEditingInfo(false);
        loadDashboardData();
      } else {
        showToast(data.message || 'Failed to update profile settings', 'error');
      }
    } catch (err) {
      showToast('Error updating profile settings', 'error');
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!matricNumber.trim()) return;
    await verifyStudent(idCardFile);
    showToast('Verification request submitted successfully! 🎓', 'success');
    setShowVerifyForm(false);
    setMatricNumber('');
    setIdCardImage('');
    setIdCardFile(null);
    loadDashboardData();
  };

  const handleIdCardUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIdCardFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setIdCardImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleToggleSold = async (productId, currentStatus) => {
    if (!token) return;
    
    const newStatus = currentStatus === 'Available' ? 'Sold' : 'Available';
    try {
      const response = await fetch(`${API_URL}/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        showToast(`Listing status updated to ${newStatus}! 🤝`, 'success');
        loadDashboardData();
      }
    } catch (err) {
      showToast('Failed to toggle status', 'error');
    }
  };

  const handleDeleteListing = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        showToast('Listing deleted successfully!', 'success');
        loadDashboardData();
      }
    } catch (err) {
      showToast('Failed to delete listing', 'error');
    }
  };

  if (loading) {
    return (
      <div style={styles.center} className="container">
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <p style={{ marginTop: '16px', color: 'var(--text-gray)' }}>Loading your dashboard command center...</p>
        </div>
      </div>
    );
  }

  // Count active and sold listings
  const activeCount = myProducts.filter(p => p.status === 'Available').length;
  const soldCount = myProducts.filter(p => p.status === 'Sold').length;
  
  // Calculate average seller rating
  const sellerRatings = profileData?.ratings || [];
  const averageRating = sellerRatings.length > 0
    ? (sellerRatings.reduce((acc, curr) => acc + curr.rating, 0) / sellerRatings.length).toFixed(1)
    : 'N/A';

  return (
    <div style={styles.container} className="container animate-fade-in">
      {/* Dashboard Welcome Header */}
      <header className="db-header">
        <div className="db-header-left">
          <div className="db-avatar-container">
            <div className="db-avatar">
              {user?.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div>
            <h1 className="db-welcome-title">Welcome back, {user?.name}! 🎓</h1>
            <p style={styles.subWelcomeText}>{user?.email} | Lead City University Student Hub</p>
          </div>
        </div>

        {/* Verification Status Banner */}
        <div className="db-verify-box">
          {user?.isVerifiedStudent ? (
            <span style={styles.verifiedBadge}>✓ LCU Verified Badge Active</span>
          ) : showVerifyForm ? (
            <form onSubmit={handleVerifySubmit} style={styles.verifyForm}>
              <input
                type="text"
                required
                placeholder="LCU Matric Number"
                value={matricNumber}
                onChange={(e) => setMatricNumber(e.target.value)}
                className="glass-input"
                style={styles.verifyInput}
              />
              <input
                type="file"
                required
                accept="image/*"
                onChange={handleIdCardUpload}
                id="dashboard-id-upload"
                style={{ display: 'none' }}
              />
              <label htmlFor="dashboard-id-upload" style={styles.idUploadLabel}>
                {idCardImage ? '✓ Selected' : 'Upload ID'}
              </label>
              <button type="submit" className="btn-primary" style={styles.verifyBtnSmall}>Verify</button>
              <button type="button" onClick={() => setShowVerifyForm(false)} className="btn-secondary" style={styles.verifyBtnSmall}>X</button>
            </form>
          ) : (
            <button onClick={() => setShowVerifyForm(true)} className="btn-primary" style={styles.requestVerifyBtn}>
              Request Verification Badge
            </button>
          )}
        </div>
      </header>

      {/* Metrics Row */}
      <section className="db-metrics">
        <div className="db-metric-card">
          <span className="db-metric-icon">🏠</span>
          <div style={styles.metricInfo}>
            <span className="db-metric-value">{activeCount}</span>
            <span className="db-metric-label">Active Listings</span>
          </div>
        </div>

        <div className="db-metric-card">
          <span className="db-metric-icon">🤝</span>
          <div style={styles.metricInfo}>
            <span className="db-metric-value">{soldCount}</span>
            <span className="db-metric-label">Sold Items</span>
          </div>
        </div>

        <div className="db-metric-card">
          <span className="db-metric-icon">❤️</span>
          <div style={styles.metricInfo}>
            <span className="db-metric-value">{profileData?.wishlist?.length || 0}</span>
            <span className="db-metric-label">Wishlist Items</span>
          </div>
        </div>

        <div className="db-metric-card">
          <span className="db-metric-icon">★</span>
          <div style={styles.metricInfo}>
            <span className="db-metric-value">{averageRating} {averageRating !== 'N/A' && '⭐'}</span>
            <span className="db-metric-label">Seller Rating</span>
          </div>
        </div>
      </section>

      {/* Main Grid: Details Sidebar & Main tabs content */}
      <div className="profile-grid" style={{ marginTop: '30px' }}>
        
        {/* Left column: Student metadata & quick links */}
        <aside className="db-sidebar-card">
          <h3 style={styles.sidebarTitle}>Personal Information</h3>
          {isEditingInfo ? (
            <div style={styles.metaList}>
              <div style={styles.metaItem}>
                <label style={styles.metaLabel}>Hostel Location:</label>
                <select
                  value={editHostel}
                  onChange={(e) => setEditHostel(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', marginTop: '4px', padding: '8px' }}
                >
                  {hostelsList.map(h => (
                    <option key={h} value={h} style={{ background: 'var(--bg-input)', color: 'var(--text-white)' }}>{h}</option>
                  ))}
                </select>
              </div>
              <div style={{ ...styles.metaItem, marginTop: '12px' }}>
                <label style={styles.metaLabel}>Faculty Affiliation:</label>
                <select
                  value={editFaculty}
                  onChange={(e) => setEditFaculty(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', marginTop: '4px', padding: '8px' }}
                >
                  {facultiesList.map(f => (
                    <option key={f} value={f} style={{ background: 'var(--bg-input)', color: 'var(--text-white)' }}>{f}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button onClick={handleSaveProfile} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}>
                  Save
                </button>
                <button onClick={() => setIsEditingInfo(false)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={styles.metaList}>
                <div style={styles.metaItem}>
                  <span style={styles.metaLabel}>Hostel Location:</span>
                  <span style={styles.metaVal}>{profileData?.hostel || user?.hostel}</span>
                </div>
                <div style={styles.metaItem}>
                  <span style={styles.metaLabel}>Faculty Affiliation:</span>
                  <span style={styles.metaVal}>{profileData?.faculty || user?.faculty}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditHostel(profileData?.hostel || user?.hostel || 'Off-Campus');
                  setEditFaculty(profileData?.faculty || user?.faculty || 'Basic Medical & Health Sciences');
                  setIsEditingInfo(true);
                }}
                className="btn-secondary"
                style={{ width: '100%', padding: '10px', fontSize: '0.85rem', marginTop: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
              >
                ✏️ Edit Details
              </button>
            </>
          )}

          <h3 style={{ ...styles.sidebarTitle, marginTop: '24px' }}>Quick Actions</h3>
          <div style={styles.quickActions}>
            <Link to="/post" className="btn-primary" style={styles.actionLink}>
              + Post a New Listing
            </Link>
            <Link to="/chat" className="btn-secondary" style={styles.actionLink}>
              💬 Open Chat Inbox
            </Link>
          </div>
        </aside>

        {/* Right column: Manage tab views */}
        <main style={styles.mainContent}>
          <div className="db-tabs">
            <button
              onClick={() => setActiveTab('listings')}
              className={`db-tab-btn ${activeTab === 'listings' ? 'active' : ''}`}
            >
              Manage My Listings ({myProducts.length})
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={`db-tab-btn ${activeTab === 'wishlist' ? 'active' : ''}`}
            >
              My Saved Wishlist ({profileData?.wishlist?.length || 0})
            </button>
          </div>

          <div style={{ marginTop: '20px' }}>
            {activeTab === 'listings' && (
              myProducts.length > 0 ? (
                <div className="db-card-list">
                  {myProducts.map((p) => (
                    <div key={p._id} className="db-product-card">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="db-product-image" />
                      ) : (
                        <div className="db-product-placeholder">No Image</div>
                      )}
                      <div className="db-product-info">
                        <h4 className="db-product-title">{p.name}</h4>
                        <span className="db-product-price">₦{p.price.toLocaleString()}</span>
                        <div className="db-product-meta">
                          📍 {p.hostelLocation}
                          <span className={`db-status-badge ${p.status === 'Sold' ? 'sold' : 'available'}`}>
                            {p.status}
                          </span>
                        </div>
                      </div>
                      <div className="db-actions">
                        <button
                          onClick={() => handleToggleSold(p._id, p.status)}
                          className="btn-primary"
                          style={{
                            background: p.status === 'Sold' ? 'var(--success)' : 'rgba(255,255,255,0.05)',
                            color: '#fff',
                            border: p.status === 'Sold' ? 'none' : '1px solid var(--border-color)',
                            boxShadow: 'none',
                            padding: '8px 12px',
                            fontSize: '0.8rem',
                            borderRadius: '6px'
                          }}
                        >
                          {p.status === 'Sold' ? 'Mark Available' : 'Mark Sold'}
                        </button>
                        <Link
                          to={`/edit/${p._id}`}
                          className="btn-secondary"
                          style={{ padding: '8px 12px', fontSize: '0.8rem', borderRadius: '6px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteListing(p._id)}
                          className="btn-secondary"
                          style={{ padding: '8px 12px', fontSize: '0.8rem', borderRadius: '6px', color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.emptyState} className="glass-panel">
                  <p>You haven't posted any products yet.</p>
                  <Link to="/post" className="btn-primary" style={{ marginTop: '12px' }}>Post a Product</Link>
                </div>
              )
            )}

            {activeTab === 'wishlist' && (
              profileData?.wishlist?.length > 0 ? (
                <div className="db-card-list">
                  {profileData.wishlist.map((p) => (
                    <div key={p._id} className="db-product-card">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="db-product-image" />
                      ) : (
                        <div className="db-product-placeholder">No Image</div>
                      )}
                      <div className="db-product-info">
                        <h4 className="db-product-title">{p.name}</h4>
                        <span className="db-product-price">₦{p.price.toLocaleString()}</span>
                        <div className="db-product-meta">
                          📍 {p.hostelLocation}
                        </div>
                      </div>
                      <div className="db-actions">
                        <Link to={`/product/${p._id}`} className="btn-primary" style={{ padding: '8px 12px', fontSize: '0.8rem', borderRadius: '6px' }}>
                          View Product
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.emptyState} className="glass-panel">
                  <p>Your saved wishlist is currently empty.</p>
                  <Link to="/" className="btn-secondary" style={{ marginTop: '12px' }}>Browse Marketplace</Link>
                </div>
              )
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

const styles = {
  container: {
    paddingTop: '32px',
    paddingBottom: '60px',
  },
  center: {
    height: '60vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderContainer: {
    textAlign: 'center',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid var(--border-color)',
    borderTop: '4px solid var(--gold)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto',
  },
  headerPanel: {
    padding: '30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
    border: '1px solid var(--border-color)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  avatarLarge: {
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-blue)',
    border: '3px solid var(--gold)',
    color: 'var(--gold)',
    fontSize: '2rem',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
  },
  welcomeText: {
    fontSize: '1.8rem',
    color: '#fff',
  },
  subWelcomeText: {
    color: 'var(--text-gray)',
    fontSize: '0.9rem',
    marginTop: '4px',
  },
  verifyBanner: {
    display: 'flex',
    alignItems: 'center',
  },
  verifiedBadge: {
    padding: '8px 16px',
    borderRadius: '6px',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: 'var(--success)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    fontWeight: '600',
    fontSize: '0.85rem',
  },
  requestVerifyBtn: {
    fontSize: '0.85rem',
    padding: '10px 20px',
  },
  verifyForm: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  verifyInput: {
    padding: '6px 12px',
    fontSize: '0.8rem',
    width: '150px',
  },
  idUploadLabel: {
    padding: '6px 10px',
    border: '1px dashed var(--border-color)',
    borderRadius: '6px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  verifyBtnSmall: {
    padding: '6px 12px',
    fontSize: '0.8rem',
  },
  metricsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginTop: '24px',
  },
  metricCard: {
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    border: '1px solid var(--border-color)',
    transition: 'var(--transition-smooth)',
  },
  metricEmoji: {
    fontSize: '2rem',
    color: 'var(--gold)',
  },
  metricInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  metricValue: {
    fontSize: '1.6rem',
    fontWeight: '800',
    color: '#fff',
  },
  metricLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-gray)',
    marginTop: '2px',
  },
  sidebarPanel: {
    padding: '24px',
    border: '1px solid var(--border-color)',
    height: 'fit-content',
  },
  sidebarTitle: {
    fontSize: '1.1rem',
    color: 'var(--gold)',
    marginBottom: '16px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '8px',
  },
  metaList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  metaItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  metaLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-gray)',
  },
  metaVal: {
    fontSize: '0.9rem',
    color: '#fff',
    fontWeight: '600',
  },
  quickActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  actionLink: {
    width: '100%',
    padding: '10px',
    fontSize: '0.85rem',
    textAlign: 'center',
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  tabsHeader: {
    display: 'flex',
    gap: '24px',
    borderBottom: '1px solid var(--border-color)',
    flexWrap: 'wrap',
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    padding: '12px 16px',
    fontSize: '1.05rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
  },
  listingsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  listingRow: {
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    border: '1px solid var(--border-color)',
    flexWrap: 'wrap',
  },
  rowImgContainer: {
    width: '70px',
    height: '70px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  rowImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  rowPlaceholderImg: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.65rem',
    color: 'var(--text-gray)',
    textAlign: 'center',
  },
  rowDetails: {
    flexGrow: 1,
    minWidth: '200px',
  },
  rowTitle: {
    fontSize: '1rem',
    color: '#fff',
    marginBottom: '4px',
  },
  rowPrice: {
    fontSize: '0.95rem',
    color: 'var(--gold)',
    fontWeight: '700',
  },
  rowMeta: {
    fontSize: '0.75rem',
    color: 'var(--text-gray)',
    marginTop: '2px',
  },
  rowActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  rowBtn: {
    padding: '8px 12px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    borderRadius: '6px',
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-gray)',
    border: '1px solid var(--border-color)',
  }
};

