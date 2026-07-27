import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config';
import { VerifiedBadge } from '../components/ProductCard';

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [reportedProducts, setReportedProducts] = useState([]);
  const [allProductsCount, setAllProductsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'users' | 'verification'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocUser, setSelectedDocUser] = useState(null);

  // Guard non-admins
  useEffect(() => {
    if (!token || !user) {
      navigate('/admin-login');
      return;
    }
    if (!user.isAdmin) {
      showToast('Access denied: Admins only.', 'error');
      navigate('/admin-login');
    }
  }, [user, token, navigate]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // Fetch reported products
      const reportRes = await fetch(`${API_URL}/api/products/admin/reported`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (reportRes.ok) {
        const data = await reportRes.json();
        setReportedProducts(data);
      }

      // Fetch users
      const usersRes = await fetch(`${API_URL}/api/auth/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data);
      }

      // Fetch all products count for system stats
      const prodRes = await fetch(`${API_URL}/api/products?status=All`);
      if (prodRes.ok) {
        const prods = await prodRes.json();
        setAllProductsCount(prods.length);
      }
    } catch {
      showToast('Error loading admin control panel data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user?.isAdmin) {
      loadAdminData();
    }
  }, [token, user]);

  const handleDismissReports = async (productId) => {
    try {
      const res = await fetch(`${API_URL}/api/products/${productId}/dismiss-reports`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Listing reports dismissed successfully! 🤝', 'success');
        loadAdminData();
      } else {
        const data = await res.json();
        showToast(data.message || 'Failed to dismiss reports', 'error');
      }
    } catch {
      showToast('Error dismissing reports', 'error');
    }
  };

  const handleDeleteListing = async (productId) => {
    if (!window.confirm('Are you sure you want to permanently delete this listing?')) return;
    try {
      const res = await fetch(`${API_URL}/api/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Listing deleted successfully!', 'success');
        loadAdminData();
      } else {
        const data = await res.json();
        showToast(data.message || 'Failed to delete listing', 'error');
      }
    } catch {
      showToast('Error deleting listing', 'error');
    }
  };

  const handleToggleVerification = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/admin/verify-student/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('User verification status updated!', 'success');
        loadAdminData();
      } else {
        const data = await res.json();
        showToast(data.message || 'Failed to update user verification', 'error');
      }
    } catch {
      showToast('Error updating verification status', 'error');
    }
  };

  // Filtered queries
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u => 
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.matricNumber?.toLowerCase().includes(q) ||
      u.hostel?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reportedProducts;
    const q = searchQuery.toLowerCase();
    return reportedProducts.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.seller?.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  }, [reportedProducts, searchQuery]);

  const pendingVerifications = useMemo(() => {
    return users.filter(u => u.studentIdCard || u.matricNumber && !u.isVerifiedStudent);
  }, [users]);

  const verifiedCount = useMemo(() => {
    return users.filter(u => u.isVerifiedStudent).length;
  }, [users]);

  if (loading) {
    return (
      <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }} className="container">
        <div style={{ width: '44px', height: '44px', border: '4px solid var(--border-color)', borderTop: '4px solid var(--gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading Admin Control Center…</p>
      </div>
    );
  }

  return (
    <div className="dash-shell animate-fade-in">

      {/* ═══════════════════ ADMIN SIDEBAR ═══════════════════ */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-profile">
          <div className="dash-avatar-ring">
            <div className="dash-avatar" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #3b82f6 100%)', color: '#fff' }}>🛡️</div>
          </div>
          <h3 className="dash-sidebar-name">{user?.name}</h3>
          <p className="dash-sidebar-email">{user?.email}</p>
          <div className="dash-sidebar-badges">
            <span className="dash-status-pill" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              🔑 System Admin
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="dash-nav">
          <button
            onClick={() => setActiveTab('reports')}
            className={`dash-nav-item${activeTab === 'reports' ? ' active' : ''}`}
          >
            <span className="dash-nav-icon">⚠️</span>
            <span>Flagged Items</span>
            {reportedProducts.length > 0 && (
              <span className="dash-nav-badge" style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
                {reportedProducts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`dash-nav-item${activeTab === 'users' ? ' active' : ''}`}
          >
            <span className="dash-nav-icon">👥</span>
            <span>User Management</span>
            <span className="dash-nav-badge">{users.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('verification')}
            className={`dash-nav-item${activeTab === 'verification' ? ' active' : ''}`}
          >
            <span className="dash-nav-icon">🎓</span>
            <span>Pending Reviews</span>
            {pendingVerifications.length > 0 && (
              <span className="dash-nav-badge" style={{ background: 'rgba(245,158,11,0.2)', color: 'var(--warning)' }}>
                {pendingVerifications.length}
              </span>
            )}
          </button>
        </nav>

        {/* Quick System Stats */}
        <div className="dash-sidebar-actions">
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Listings:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{allProductsCount}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Verified Students:</span>
              <strong style={{ color: 'var(--success)' }}>{verifiedCount}</strong>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══════════════════ MAIN ADMIN PANEL ═══════════════════ */}
      <main className="dash-main">

        {/* Welcome Admin Banner */}
        <div className="dash-banner" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, var(--bg-card) 100%)' }}>
          <div>
            <h1 className="dash-banner-title">🛡️ Admin Control Hub</h1>
            <p className="dash-banner-sub">Lead City University Student Marketplace Management Portal</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={loadAdminData} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
              🔄 Refresh Data
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="dash-metrics">
          <div className="dash-metric">
            <div className="dash-metric-icon">👥</div>
            <div className="dash-metric-value">{users.length}</div>
            <div className="dash-metric-label">Total Accounts</div>
          </div>
          <div className="dash-metric">
            <div className="dash-metric-icon">🎓</div>
            <div className="dash-metric-value" style={{ color: 'var(--success)' }}>{verifiedCount}</div>
            <div className="dash-metric-label">Verified Students</div>
          </div>
          <div className="dash-metric">
            <div className="dash-metric-icon">⚠️</div>
            <div className="dash-metric-value" style={{ color: reportedProducts.length > 0 ? 'var(--error)' : 'var(--text-primary)' }}>
              {reportedProducts.length}
            </div>
            <div className="dash-metric-label">Flagged Listings</div>
          </div>
          <div className="dash-metric">
            <div className="dash-metric-icon">📦</div>
            <div className="dash-metric-value">{allProductsCount}</div>
            <div className="dash-metric-label">Marketplace Items</div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mkt-search-wrap" style={{ marginBottom: '8px' }}>
          <span className="mkt-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Filter records by name, email, matric number, or category..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="glass-input mkt-search-input"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="mkt-search-clear">✕</button>
          )}
        </div>

        {/* ══════════ FLAGGED ITEMS TAB ══════════ */}
        {activeTab === 'reports' && (
          <>
            <div className="dash-section-header">
              <h2 className="dash-section-title">⚠️ Flagged Items <span className="dash-section-count">{filteredReports.length}</span></h2>
            </div>
            {filteredReports.length > 0 ? (
              <div className="dash-listing-grid">
                {filteredReports.map(p => (
                  <div key={p._id} className="dash-listing-card" style={{ borderLeft: '3px solid var(--error)' }}>
                    {p.image
                      ? <img src={p.image} alt={p.name} className="dash-listing-img" />
                      : <div className="dash-listing-placeholder">🖼️</div>
                    }
                    <div className="dash-listing-info">
                      <h4 className="dash-listing-name">{p.name}</h4>
                      <span className="dash-listing-price">₦{p.price?.toLocaleString()}</span>
                      <div className="dash-listing-meta">
                        <span>Seller: <strong>{p.seller?.name || 'Unknown'}</strong> ({p.seller?.email})</span>
                        <span style={{ color: 'var(--error)', fontWeight: '700' }}>⚠️ {p.reports?.length || 0} Reports</span>
                      </div>
                    </div>
                    <div className="dash-listing-actions">
                      <button onClick={() => handleDismissReports(p._id)} className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        ✓ Dismiss
                      </button>
                      <button onClick={() => handleDeleteListing(p._id)} className="btn-danger" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dash-empty">
                <div className="dash-empty-icon">🎉</div>
                <p className="dash-empty-title">All Clean!</p>
                <p className="dash-empty-sub">There are no flagged or reported listings awaiting review.</p>
              </div>
            )}
          </>
        )}

        {/* ══════════ USER MANAGEMENT TAB ══════════ */}
        {activeTab === 'users' && (
          <>
            <div className="dash-section-header">
              <h2 className="dash-section-title">👥 Registered Accounts <span className="dash-section-count">{filteredUsers.length}</span></h2>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '14px 18px', color: 'var(--gold)' }}>User</th>
                      <th style={{ padding: '14px 18px', color: 'var(--gold)' }}>Affiliation</th>
                      <th style={{ padding: '14px 18px', color: 'var(--gold)' }}>Status</th>
                      <th style={{ padding: '14px 18px', color: 'var(--gold)', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {u.name}
                            {u.isAdmin && <span className="dash-boosted-badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>Admin</span>}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <div>🏛️ {u.faculty || 'Unspecified'}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>🏠 {u.hostel || 'Off-Campus'} {u.matricNumber ? `• 🪪 ${u.matricNumber}` : ''}</div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          {u.isVerifiedStudent ? (
                            <VerifiedBadge size="sm" />
                          ) : (
                            <span className="dash-status-pill unverified">⏳ Unverified</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {u.studentIdCard && (
                              <button onClick={() => setSelectedDocUser(u)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                                📎 ID Doc
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleVerification(u._id)}
                              className="btn-secondary"
                              style={{
                                padding: '6px 14px', fontSize: '0.75rem',
                                color: u.isVerifiedStudent ? 'var(--warning)' : 'var(--success)',
                                borderColor: u.isVerifiedStudent ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)'
                              }}
                            >
                              {u.isVerifiedStudent ? 'Revoke Badge' : '✓ Grant Badge'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ══════════ PENDING VERIFICATION REVIEWS TAB ══════════ */}
        {activeTab === 'verification' && (
          <>
            <div className="dash-section-header">
              <h2 className="dash-section-title">🎓 Verification Applications <span className="dash-section-count">{pendingVerifications.length}</span></h2>
            </div>
            {pendingVerifications.length > 0 ? (
              <div className="dash-listing-grid">
                {pendingVerifications.map(u => (
                  <div key={u._id} className="dash-listing-card">
                    <div className="dash-avatar" style={{ width: '56px', height: '56px', fontSize: '1.4rem', flexShrink: 0 }}>
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="dash-listing-info">
                      <h4 className="dash-listing-name">{u.name}</h4>
                      <div className="dash-listing-meta">
                        <span>📧 {u.email}</span>
                        <span>🪪 Matric: <strong>{u.matricNumber || 'Not provided'}</strong></span>
                        <span>🏛️ {u.faculty || 'No faculty'}</span>
                      </div>
                    </div>
                    <div className="dash-listing-actions">
                      {u.studentIdCard && (
                        <button onClick={() => setSelectedDocUser(u)} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.78rem' }}>
                          👁️ View ID Image
                        </button>
                      )}
                      <button onClick={() => handleToggleVerification(u._id)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.78rem' }}>
                        🎓 Approve Verification
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dash-empty">
                <div className="dash-empty-icon">🎓</div>
                <p className="dash-empty-title">No Pending Verification Requests</p>
                <p className="dash-empty-sub">All student verification requests have been processed.</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* ID Card Document Modal */}
      {selectedDocUser && (
        <div className="profile-modal-overlay" onClick={() => setSelectedDocUser(null)}>
          <div className="profile-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="profile-modal-header">
              <h3 className="profile-modal-title">Student ID Card — {selectedDocUser.name}</h3>
              <button className="profile-modal-close" onClick={() => setSelectedDocUser(null)}>✕</button>
            </div>
            <div className="profile-modal-body" style={{ alignItems: 'center', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Matric Number: <strong>{selectedDocUser.matricNumber || 'Unspecified'}</strong>
              </p>
              <img
                src={selectedDocUser.studentIdCard}
                alt="Student ID Card"
                style={{ width: '100%', maxHeight: '380px', objectFit: 'contain', borderRadius: '10px', border: '1px solid var(--border-color)' }}
              />
            </div>
            <div className="profile-modal-footer">
              <button onClick={() => setSelectedDocUser(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Close</button>
              {!selectedDocUser.isVerifiedStudent && (
                <button
                  onClick={() => { handleToggleVerification(selectedDocUser._id); setSelectedDocUser(null); }}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  🎓 Approve Verification
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation for Admin */}
      <div className="dash-mobile-toggle">
        <div className="dash-mobile-nav">
          <button onClick={() => setActiveTab('reports')} className={`dash-mobile-nav-item${activeTab === 'reports' ? ' active' : ''}`}>
            <span className="dash-mobile-icon">⚠️</span>
            <span>Flagged</span>
          </button>
          <button onClick={() => setActiveTab('users')} className={`dash-mobile-nav-item${activeTab === 'users' ? ' active' : ''}`}>
            <span className="dash-mobile-icon">👥</span>
            <span>Users</span>
          </button>
          <button onClick={() => setActiveTab('verification')} className={`dash-mobile-nav-item${activeTab === 'verification' ? ' active' : ''}`}>
            <span className="dash-mobile-icon">🎓</span>
            <span>Reviews</span>
          </button>
        </div>
      </div>
    </div>
  );
}
