import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config';

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [reportedProducts, setReportedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' or 'users'

  // Safety check: redirect non-admins
  useEffect(() => {
    if (!token || !user) {
      navigate('/auth');
      return;
    }
    if (!user.isAdmin) {
      showToast('Access denied: Admins only.', 'error');
      navigate('/');
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      showToast('Error updating verification status', 'error');
    }
  };

  if (loading) {
    return (
      <div style={styles.center} className="container">
        <p>Loading Admin Dashboard metrics...</p>
      </div>
    );
  }

  return (
    <div style={styles.container} className="container animate-fade-in">
      <header style={styles.header}>
        <h1 style={{ color: '#fff', fontSize: '2rem' }}>🛡️ Admin Control Panel</h1>
        <p style={{ color: 'var(--text-gray)', marginTop: '4px' }}>Lead City University Student Marketplace Management Portal</p>
      </header>

      {/* Metrics Grid */}
      <section style={styles.metricsGrid}>
        <div style={styles.metricCard} className="glass-panel">
          <span style={{ fontSize: '2rem' }}>👥</span>
          <div>
            <h3 style={{ color: '#fff', fontSize: '1.4rem' }}>{users.length}</h3>
            <p style={{ color: 'var(--text-gray)', fontSize: '0.8rem' }}>Total Accounts</p>
          </div>
        </div>
        <div style={styles.metricCard} className="glass-panel">
          <span style={{ fontSize: '2rem' }}>⚠️</span>
          <div>
            <h3 style={{ color: 'var(--error)', fontSize: '1.4rem' }}>{reportedProducts.length}</h3>
            <p style={{ color: 'var(--text-gray)', fontSize: '0.8rem' }}>Reported Items</p>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div style={styles.tabs} className="db-tabs">
        <button
          onClick={() => setActiveTab('reports')}
          className={`db-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
        >
          Flagged Listings ({reportedProducts.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`db-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
        >
          User Registrations ({users.length})
        </button>
      </div>

      <main style={{ marginTop: '20px' }}>
        {activeTab === 'reports' && (
          reportedProducts.length > 0 ? (
            <div style={styles.tableContainer} className="glass-panel">
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Product Details</th>
                    <th style={styles.th}>Seller</th>
                    <th style={styles.th}>Reports Count</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportedProducts.map((p) => (
                    <tr key={p._id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          {p.image ? (
                            <img src={p.image} alt={p.name} style={styles.thumbnail} />
                          ) : (
                            <div style={styles.placeholderThumbnail}>No Img</div>
                          )}
                          <div>
                            <div style={{ color: '#fff', fontWeight: 'bold' }}>{p.name}</div>
                            <div style={{ color: 'var(--gold)', fontSize: '0.8rem' }}>₦{p.price.toLocaleString()}</div>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: '#fff' }}>{p.seller?.name}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-gray)' }}>{p.seller?.email}</div>
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>⚠️ {p.reports?.length || 0} reports</span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleDismissReports(p._id)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                            Dismiss
                          </button>
                          <button onClick={() => handleDeleteListing(p._id)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={styles.emptyState} className="glass-panel">
              <p>Great job! There are no reported listings currently awaiting review.</p>
            </div>
          )
        )}

        {activeTab === 'users' && (
          <div style={styles.tableContainer} className="glass-panel">
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>User Info</th>
                  <th style={styles.th}>Affiliation</th>
                  <th style={styles.th}>Verification</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} style={styles.tr}>
                    <td style={styles.td}>
                      <span style={{ color: '#fff', fontWeight: 'bold' }}>{u.name}</span>
                      {u.isAdmin && <span style={styles.adminTag}>Admin</span>}
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-gray)' }}>{u.email}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: 'var(--text-gray)' }}>Hostel:</span> {u.hostel || 'None'}
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-gray)' }}>Faculty: {u.faculty || 'None'}</div>
                    </td>
                    <td style={styles.td}>
                      {u.isVerifiedStudent ? (
                        <span style={{ color: 'var(--success)', fontWeight: '600', fontSize: '0.85rem' }}>✓ Student Verified</span>
                      ) : (
                        <span style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>Unverified</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => handleToggleVerification(u._id)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                        {u.isVerifiedStudent ? 'Revoke Badge' : 'Grant Badge'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
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
    color: 'var(--text-gray)',
  },
  header: {
    marginBottom: '32px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  metricCard: {
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    border: '1px solid var(--border-color)',
  },
  tabs: {
    borderBottom: '1px solid var(--border-color)',
    marginBottom: '20px',
  },
  tableContainer: {
    border: '1px solid var(--border-color)',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    borderBottom: '1px solid var(--border-color)',
    background: 'rgba(0,0,0,0.2)',
  },
  th: {
    padding: '16px',
    color: 'var(--gold)',
    fontWeight: '600',
    fontSize: '0.9rem',
  },
  tr: {
    borderBottom: '1px solid var(--border-color)',
    '&:last-child': {
      borderBottom: 'none',
    }
  },
  td: {
    padding: '16px',
    verticalAlign: 'middle',
    fontSize: '0.9rem',
  },
  thumbnail: {
    width: '42px',
    height: '42px',
    borderRadius: '4px',
    objectFit: 'cover',
    border: '1px solid var(--border-color)',
  },
  placeholderThumbnail: {
    width: '42px',
    height: '42px',
    borderRadius: '4px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.65rem',
    color: 'var(--text-gray)',
  },
  adminTag: {
    marginLeft: '8px',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#3b82f6',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '4px',
    padding: '1px 6px',
    fontSize: '0.7rem',
    fontWeight: '600',
  },
  emptyState: {
    padding: '48px',
    textAlign: 'center',
    color: 'var(--text-gray)',
    border: '1px solid var(--border-color)',
  }
};
