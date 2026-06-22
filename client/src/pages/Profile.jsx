import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';

export default function Profile() {
  const { user, token, fetchProfile, verifyStudent } = useAuth();
  
  const [profileData, setProfileData] = useState(null);
  const [myProducts, setMyProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('listings'); // 'listings' or 'wishlist'
  
  // Verification states
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [matricNumber, setMatricNumber] = useState('');
  const [idCardImage, setIdCardImage] = useState('');

  const loadProfileAndProducts = async () => {
    setLoading(true);
    try {
      // 1. Fetch user profile (wishlist details included)
      const profile = await fetchProfile();
      if (profile) {
        setProfileData(profile);
      }
      
      // 2. Fetch products created by this user
      if (user?._id) {
        const response = await fetch(`${API_URL}/api/products?status=All`);
        if (response.ok) {
          const allProducts = await response.json();
          // Filter products belonging to current user
          const filtered = allProducts.filter(p => p.seller?._id === user._id || p.seller === user._id);
          setMyProducts(filtered);
        }
      }
    } catch (err) {
      setError('Failed to fetch profile details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadProfileAndProducts();
    }
  }, [token]);

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!matricNumber.trim()) return;
    await verifyStudent();
    setShowVerifyForm(false);
    setMatricNumber('');
    setIdCardImage('');
    loadProfileAndProducts();
  };

  const handleIdCardUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
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
        // Reload listings
        loadProfileAndProducts();
      }
    } catch (err) {
      console.error(err);
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
        loadProfileAndProducts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={styles.center} className="container">
        <p>Loading profile details...</p>
      </div>
    );
  }

  return (
    <div style={styles.container} className="container animate-fade-in">
      <div className="profile-grid">
        {/* Left Side: Profile Summary Info */}
        <section style={styles.profileCard} className="glass-panel">
          <div style={styles.avatarLarge}>
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <h2 style={styles.userName}>{user?.name}</h2>
          <p style={styles.userEmail}>{user?.email}</p>
          
          <div style={styles.badgeContainer}>
            {user?.isVerifiedStudent ? (
              <span style={styles.verifiedBadge}>✓ LCU Verified Student</span>
            ) : showVerifyForm ? (
              <form onSubmit={handleVerifySubmit} style={styles.verifyForm}>
                <h4 style={styles.verifyTitle}>Student Verification</h4>
                
                <div style={styles.verifyField}>
                  <label style={styles.verifyLabel}>Matric Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LCU/UG/23/12345"
                    value={matricNumber}
                    onChange={(e) => setMatricNumber(e.target.value)}
                    className="glass-input"
                    style={styles.verifyInput}
                  />
                </div>

                <div style={styles.verifyField}>
                  <label style={styles.verifyLabel}>Student ID Card Image</label>
                  <input
                    type="file"
                    required
                    accept="image/*"
                    onChange={handleIdCardUpload}
                    id="id-card-upload"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="id-card-upload" style={styles.idCardLabel}>
                    {idCardImage ? (
                      <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>✓ Image Selected</span>
                    ) : (
                      <span>Upload ID Card Image</span>
                    )}
                  </label>
                </div>

                <div style={styles.verifyActions}>
                  <button type="button" onClick={() => setShowVerifyForm(false)} className="btn-secondary" style={styles.verifyFormBtn}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" style={styles.verifyFormBtn}>
                    Verify
                  </button>
                </div>
              </form>
            ) : (
              <button onClick={() => setShowVerifyForm(true)} className="btn-primary" style={styles.verifyBtn}>
                Request Verification Badge
              </button>
            )}
          </div>

          <div style={styles.infoList}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Hostel:</span>
              <span style={styles.infoVal}>{profileData?.hostel || user?.hostel}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Faculty:</span>
              <span style={styles.infoVal}>{profileData?.faculty || user?.faculty}</span>
            </div>
          </div>
        </section>

        {/* Right Side: Tab switcher for listings and wishlist */}
        <div style={styles.content}>
          <div style={styles.tabsHeader}>
            <button
              onClick={() => setActiveTab('listings')}
              style={{
                ...styles.tabBtn,
                borderBottom: activeTab === 'listings' ? '3px solid var(--gold)' : '3px solid transparent',
                color: activeTab === 'listings' ? 'var(--gold)' : 'var(--text-gray)',
              }}
            >
              My Listings ({myProducts.length})
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              style={{
                ...styles.tabBtn,
                borderBottom: activeTab === 'wishlist' ? '3px solid var(--gold)' : '3px solid transparent',
                color: activeTab === 'wishlist' ? 'var(--gold)' : 'var(--text-gray)',
              }}
            >
              My Wishlist ({profileData?.wishlist?.length || 0})
            </button>
          </div>

          <div style={{ marginTop: '20px' }}>
            {activeTab === 'listings' ? (
              myProducts.length > 0 ? (
                <div style={styles.listingsContainer}>
                  {myProducts.map((p) => (
                    <div key={p._id} style={styles.listingRow} className="glass-panel">
                      <div style={styles.rowImgContainer}>
                        {p.image ? (
                          <img src={p.image} alt={p.name} style={styles.rowImg} />
                        ) : (
                          <div style={styles.rowPlaceholderImg}>No Image</div>
                        )}
                      </div>
                      <div style={styles.rowDetails}>
                        <h4 style={styles.rowTitle}>{p.name}</h4>
                        <span style={styles.rowPrice}>₦{p.price.toLocaleString()}</span>
                        <div style={styles.rowMeta}>
                          📍 {p.hostelLocation} | Category: {p.category}
                        </div>
                      </div>
                      <div style={styles.rowActions}>
                        <button
                          onClick={() => handleToggleSold(p._id, p.status)}
                          className="btn-primary"
                          style={{
                            ...styles.rowBtn,
                            background: p.status === 'Sold' ? 'var(--success)' : 'rgba(255,255,255,0.05)',
                            color: p.status === 'Sold' ? '#fff' : '#fff',
                            border: p.status === 'Sold' ? 'none' : '1px solid var(--border-color)',
                            boxShadow: 'none'
                          }}
                        >
                          {p.status === 'Sold' ? 'Sold' : 'Mark Sold'}
                        </button>
                        <Link
                          to={`/edit/${p._id}`}
                          className="btn-secondary"
                          style={{ ...styles.rowBtn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteListing(p._id)}
                          className="btn-secondary"
                          style={{ ...styles.rowBtn, color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }}
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
            ) : (
              profileData?.wishlist?.length > 0 ? (
                <div style={styles.listingsContainer}>
                  {profileData.wishlist.map((p) => (
                    <div key={p._id} style={styles.listingRow} className="glass-panel">
                      <div style={styles.rowImgContainer}>
                        {p.image ? (
                          <img src={p.image} alt={p.name} style={styles.rowImg} />
                        ) : (
                          <div style={styles.rowPlaceholderImg}>No Image</div>
                        )}
                      </div>
                      <div style={styles.rowDetails}>
                        <h4 style={styles.rowTitle}>{p.name}</h4>
                        <span style={styles.rowPrice}>₦{p.price.toLocaleString()}</span>
                        <div style={styles.rowMeta}>
                          📍 {p.hostelLocation}
                        </div>
                      </div>
                      <div style={styles.rowActions}>
                        <Link to={`/product/${p._id}`} className="btn-primary" style={styles.rowBtn}>
                          View Product
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.emptyState} className="glass-panel">
                  <p>Your wishlist is currently empty.</p>
                  <Link to="/" className="btn-secondary" style={{ marginTop: '12px' }}>Browse Marketplace</Link>
                </div>
              )
            )}
          </div>
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
  center: {
    height: '60vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 2.5fr',
    gap: '32px',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    }
  },
  profileCard: {
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    border: '1px solid var(--border-color)',
    height: 'fit-content',
  },
  avatarLarge: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-blue)',
    border: '3px solid var(--gold)',
    color: 'var(--gold)',
    fontSize: '2.5rem',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  userName: {
    fontSize: '1.4rem',
    color: '#fff',
    marginBottom: '6px',
  },
  userEmail: {
    fontSize: '0.85rem',
    color: 'var(--text-gray)',
    marginBottom: '24px',
  },
  badgeContainer: {
    width: '100%',
    textAlign: 'center',
    marginBottom: '24px',
  },
  verifiedBadge: {
    display: 'inline-block',
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: 'var(--success)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    fontWeight: '600',
    fontSize: '0.85rem',
  },
  verifyBtn: {
    width: '100%',
    fontSize: '0.8rem',
    padding: '10px',
  },
  infoList: {
    width: '100%',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
  },
  infoLabel: {
    color: 'var(--text-gray)',
  },
  infoVal: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
  },
  tabsHeader: {
    display: 'flex',
    gap: '24px',
    borderBottom: '1px solid var(--border-color)',
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
  },
  rowBtn: {
    padding: '8px 12px',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-gray)',
    border: '1px solid var(--border-color)',
  },
  verifyForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: 'rgba(0,0,0,0.15)',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    textAlign: 'left',
    width: '100%',
  },
  verifyTitle: {
    fontSize: '0.95rem',
    color: '#fff',
    fontWeight: '600',
    marginBottom: '4px',
    textAlign: 'center',
  },
  verifyField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  verifyLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-gray)',
    fontWeight: '500',
  },
  verifyInput: {
    padding: '8px 12px',
    fontSize: '0.85rem',
  },
  idCardLabel: {
    display: 'block',
    padding: '10px',
    border: '1px dashed var(--border-color)',
    borderRadius: '6px',
    textAlign: 'center',
    fontSize: '0.8rem',
    color: 'var(--text-gray)',
    cursor: 'pointer',
    backgroundColor: 'rgba(0,0,0,0.2)',
    transition: 'var(--transition-smooth)',
  },
  verifyActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  verifyFormBtn: {
    flex: 1,
    padding: '8px',
    fontSize: '0.8rem',
  }
};
