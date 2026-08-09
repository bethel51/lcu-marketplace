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
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reports');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocUser, setSelectedDocUser] = useState(null);


  // Guard non-admins
  useEffect(() => {
    if (!token || !user) { navigate('/admin-login'); return; }
    if (!user.isAdmin) { showToast('Access denied: Admins only.', 'error'); navigate('/admin-login'); }
  }, [user, token, navigate]);

  const loadAdminData = async (silent = false) => {
    if (!silent) setLoading(true);
    
    // 1. Fetch reported products
    try {
      const res = await fetch(`${API_URL}/api/products/admin/reported`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      if (res.ok) {
        setReportedProducts(await res.json());
      } else {
        console.error('Failed to load reported products:', res.status, await res.text().catch(() => ''));
      }
    } catch (err) {
      console.error('Error fetching reported products:', err);
    }

    // 2. Fetch users
    try {
      const res = await fetch(`${API_URL}/api/auth/admin/users`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      if (res.ok) {
        setUsers(await res.json());
      } else {
        console.error('Failed to load users:', res.status, await res.text().catch(() => ''));
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }

    // 3. Fetch all products count
    try {
      const res = await fetch(`${API_URL}/api/products?status=All`);
      if (res.ok) {
        const p = await res.json();
        if (Array.isArray(p)) {
          setAllProductsCount(p.length);
        }
      } else {
        console.error('Failed to load products count:', res.status, await res.text().catch(() => ''));
      }
    } catch (err) {
      console.error('Error fetching products count:', err);
    }

    // 4. Fetch orders
    try {
      const res = await fetch(`${API_URL}/api/auth/admin/orders`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      if (res.ok) {
        setAllOrders(await res.json());
      } else {
        console.error('Failed to load orders:', res.status, await res.text().catch(() => ''));
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }

    setLoading(false);
  };

  useEffect(() => { if (token && user?.isAdmin) loadAdminData(); }, [token, user]);

  // ── Handlers ──────────────────────────────────────────────────

  const handleDismissReports = async (productId) => {
    const res = await fetch(`${API_URL}/api/products/${productId}/dismiss-reports`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) { showToast('Reports dismissed', 'success'); loadAdminData(true); }
    else showToast((await res.json()).message, 'error');
  };

  const handleDeleteListing = async (productId) => {
    if (!window.confirm('Delete this listing permanently?')) return;
    const res = await fetch(`${API_URL}/api/products/${productId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) { showToast('Listing deleted', 'success'); loadAdminData(true); }
    else showToast((await res.json()).message, 'error');
  };

  const handleToggleVerification = async (userId) => {
    const res = await fetch(`${API_URL}/api/auth/admin/verify-student/${userId}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) { showToast('Verification updated', 'success'); loadAdminData(true); }
    else showToast((await res.json()).message, 'error');
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Ban & permanently delete "${userName}"?\n\nThis removes their account, listings, and orders.`)) return;
    const res = await fetch(`${API_URL}/api/auth/admin/users/${userId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) { showToast(`${userName} removed`, 'success'); loadAdminData(true); }
    else showToast((await res.json()).message, 'error');
  };



  // ── Computed ──────────────────────────────────────────────────

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.matricNumber?.toLowerCase().includes(q) || u.hostel?.toLowerCase().includes(q));
  }, [users, searchQuery]);

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reportedProducts;
    const q = searchQuery.toLowerCase();
    return reportedProducts.filter(p => p.name?.toLowerCase().includes(q) || p.seller?.name?.toLowerCase().includes(q));
  }, [reportedProducts, searchQuery]);

  // Fix #5: Only users who actually submitted an ID card
  const pendingVerifications = useMemo(() => {
    const pending = users.filter(u => u.studentIdCard && !u.isVerifiedStudent);
    if (!searchQuery.trim()) return pending;
    const q = searchQuery.toLowerCase();
    return pending.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.matricNumber?.toLowerCase().includes(q));
  }, [users, searchQuery]);

  const verifiedCount = useMemo(() => users.filter(u => u.isVerifiedStudent).length, [users]);
  const totalRevenue = useMemo(() => allOrders.filter(o => o.paymentStatus === 'Paid').reduce((s, o) => s + (o.amount || 0), 0), [allOrders]);
  const paidOrders = useMemo(() => allOrders.filter(o => o.paymentStatus === 'Paid'), [allOrders]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return allOrders;
    const q = searchQuery.toLowerCase();
    return allOrders.filter(o => 
      o.product?.name?.toLowerCase().includes(q) || 
      o.buyer?.name?.toLowerCase().includes(q) || 
      o.buyer?.email?.toLowerCase().includes(q) || 
      o.seller?.name?.toLowerCase().includes(q) || 
      o.seller?.email?.toLowerCase().includes(q)
    );
  }, [allOrders, searchQuery]);

  const navTabs = [
    { id: 'reports',      icon: '⚠️', label: 'Flagged',  badge: reportedProducts.length },
    { id: 'users',        icon: '👥', label: 'Users',    badge: users.length },
    { id: 'verification', icon: '🎓', label: 'Verify',   badge: pendingVerifications.length },
    { id: 'orders',       icon: '💳', label: 'Orders',   badge: 0 },
  ];

  if (loading) {
    return (
      <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }} className="container">
        <div style={{ width: '44px', height: '44px', border: '4px solid var(--border-color)', borderTop: '4px solid var(--gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading Admin Panel…</p>
      </div>
    );
  }

  return (
    <div className="dash-shell animate-fade-in">

      {/* ═══ ADMIN SIDEBAR ═══ */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-profile">
          <div className="dash-avatar-ring">
            <div className="dash-avatar" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #3b82f6 100%)', color: '#fff' }}>🛡️</div>
          </div>
          <h3 className="dash-sidebar-name">{user?.name}</h3>
          <p className="dash-sidebar-email">{user?.email}</p>
          <div className="dash-sidebar-badges">
            <span className="dash-status-pill" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>🔑 Admin</span>
          </div>
        </div>
        <nav className="dash-nav">
          {navTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`dash-nav-item${activeTab === tab.id ? ' active' : ''}`}>
              <span className="dash-nav-icon">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className="dash-nav-badge" style={
                  tab.id === 'reports' ? { background: 'rgba(239,68,68,0.2)', color: '#f87171' } :
                  tab.id === 'verification' ? { background: 'rgba(245,158,11,0.2)', color: 'var(--warning)' } : {}
                }>{tab.badge}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="dash-sidebar-actions">
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { label: 'Total Listings', val: allProductsCount, col: 'var(--text-primary)' },
              { label: 'Verified Students', val: verifiedCount, col: 'var(--success)' },
              { label: 'Total Revenue', val: `₦${totalRevenue.toLocaleString()}`, col: 'var(--gold)' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{s.label}:</span>
                <strong style={{ color: s.col }}>{s.val}</strong>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ═══ MAIN PANEL ═══ */}
      <main className="dash-main">

        {/* Banner */}
        <div className="dash-banner" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, var(--bg-card) 100%)' }}>
          <div>
            <h1 className="dash-banner-title">🛡️ Admin Control Panel</h1>
            <p className="dash-banner-sub">LCU Marketplace — Manage users, listings, and orders</p>
          </div>
          <button onClick={loadAdminData} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>🔄 Refresh</button>
        </div>

        {/* Metrics */}
        <div className="dash-metrics">
          {[
            { icon: '👥', val: users.length, label: 'Total Accounts', col: 'var(--text-primary)' },
            { icon: '🎓', val: verifiedCount, label: 'Verified Students', col: 'var(--success)' },
            { icon: '⚠️', val: reportedProducts.length, label: 'Flagged Listings', col: reportedProducts.length > 0 ? 'var(--error)' : 'var(--text-primary)' },
            { icon: '💳', val: paidOrders.length, label: 'Paid Orders', col: 'var(--gold)' },
          ].map(m => (
            <div 
              key={m.label} 
              className="dash-metric"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                if (m.label === 'Total Accounts') setActiveTab('users');
                else if (m.label === 'Verified Students') setActiveTab('users');
                else if (m.label === 'Flagged Listings') setActiveTab('reports');
                else if (m.label === 'Paid Orders') setActiveTab('orders');
              }}
            >
              <div className="dash-metric-icon">{m.icon}</div>
              <div className="dash-metric-value" style={{ color: m.col }}>{m.val}</div>
              <div className="dash-metric-label">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Search bar */}
        {['reports', 'users', 'verification', 'orders'].includes(activeTab) && (
          <div className="mkt-search-wrap" style={{ marginBottom: '8px' }}>
            <span className="mkt-search-icon">🔍</span>
            <input type="text" placeholder="Filter by name, email, matric..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="glass-input mkt-search-input" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="mkt-search-clear">✕</button>}
          </div>
        )}

        {/* ══ FLAGGED TAB ══ */}
        {activeTab === 'reports' && (
          <>
            <div className="dash-section-header">
              <h2 className="dash-section-title">⚠️ Flagged Items <span className="dash-section-count">{filteredReports.length}</span></h2>
            </div>
            {filteredReports.length > 0 ? (
              <div className="dash-listing-grid">
                {filteredReports.map(p => (
                  <div key={p._id} className="dash-listing-card" style={{ borderLeft: '3px solid var(--error)' }}>
                    {p.image ? <img src={p.image} alt={p.name} className="dash-listing-img" /> : <div className="dash-listing-placeholder">🖼️</div>}
                    <div className="dash-listing-info">
                      <h4 className="dash-listing-name">{p.name}</h4>
                      <span className="dash-listing-price">₦{p.price?.toLocaleString()}</span>
                      <div className="dash-listing-meta">
                        <span>Seller: <strong>{p.seller?.name || 'Unknown'}</strong></span>
                        <span style={{ color: 'var(--error)', fontWeight: '700' }}>⚠️ {p.reports?.length || 0} reports</span>
                      </div>
                    </div>
                    <div className="dash-listing-actions">
                      <button onClick={() => handleDismissReports(p._id)} className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>✓ Dismiss</button>
                      <button onClick={() => handleDeleteListing(p._id)} className="btn-danger" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>🗑 Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dash-empty">
                <div className="dash-empty-icon">🎉</div>
                <p className="dash-empty-title">All Clean!</p>
                <p className="dash-empty-sub">No flagged listings right now.</p>
              </div>
            )}
          </>
        )}

        {/* ══ USERS TAB ══ */}
        {activeTab === 'users' && (
          <>
            <div className="dash-section-header">
              <h2 className="dash-section-title">👥 All Users <span className="dash-section-count">{filteredUsers.length}</span></h2>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color)' }}>
                      {['User', 'Affiliation', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', color: 'var(--gold)', textAlign: h === 'Actions' ? 'right' : 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {u.name}
                            {u.isPro && <span style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308', border: '1px solid rgba(234,179,8,0.3)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '800' }}>⭐ PRO</span>}
                            {u.isAdmin && <span className="dash-boosted-badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>Admin</span>}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ color: 'var(--text-secondary)' }}>🏛️ {u.faculty || 'Unspecified'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🏠 {u.hostel || 'Off-Campus'}{u.matricNumber ? ` • 🪪 ${u.matricNumber}` : ''}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {u.isVerifiedStudent ? <VerifiedBadge size="sm" /> : <span className="dash-status-pill unverified">⏳ Unverified</span>}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {u.studentIdCard && (
                              <button onClick={() => setSelectedDocUser(u)} className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.73rem' }}>📎 ID</button>
                            )}
                            <button
                              onClick={() => handleToggleVerification(u._id)}
                              className="btn-secondary"
                              style={{ padding: '5px 10px', fontSize: '0.73rem', color: u.isVerifiedStudent ? 'var(--warning)' : 'var(--success)', borderColor: u.isVerifiedStudent ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)' }}
                            >
                              {u.isVerifiedStudent ? 'Revoke' : '✓ Verify'}
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`${API_URL}/api/auth/users/${u._id}/toggle-pro`, {
                                    method: 'PUT',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                  });
                                  const data = await res.json();
                                  if (res.ok) {
                                    showToast(data.message, 'success');
                                    loadAdminData(true);
                                  } else {
                                    showToast(data.message, 'error');
                                  }
                                } catch {
                                  showToast('Failed to toggle PRO status', 'error');
                                }
                              }}
                              className="btn-secondary"
                              style={{ padding: '5px 10px', fontSize: '0.73rem', color: u.isPro ? '#f59e0b' : '#9ca3af', borderColor: u.isPro ? 'rgba(245,158,11,0.4)' : 'var(--border-color)' }}
                            >
                              {u.isPro ? '⭐ PRO' : '☆ Make PRO'}
                            </button>
                            {!u.isAdmin && (
                              <button onClick={() => handleDeleteUser(u._id, u.name)} className="btn-danger" style={{ padding: '5px 10px', fontSize: '0.73rem' }}>🚫 Ban</button>
                            )}
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

        {/* ══ VERIFICATION TAB ══ */}
        {activeTab === 'verification' && (
          <>
            <div className="dash-section-header">
              <h2 className="dash-section-title">🎓 ID Submissions <span className="dash-section-count">{pendingVerifications.length}</span></h2>
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
                        <span>🪪 <strong>{u.matricNumber || 'No matric'}</strong></span>
                        <span>🏛️ {u.faculty || 'No faculty'}</span>
                      </div>
                    </div>
                    <div className="dash-listing-actions">
                      <button onClick={() => setSelectedDocUser(u)} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.78rem' }}>👁️ View ID</button>
                      <button onClick={() => handleToggleVerification(u._id)} className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.78rem' }}>🎓 Approve</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dash-empty">
                <div className="dash-empty-icon">🎓</div>
                <p className="dash-empty-title">No Pending ID Submissions</p>
                <p className="dash-empty-sub">All submitted student IDs have been reviewed.</p>
              </div>
            )}
          </>
        )}

        {/* ══ ORDERS TAB ══ */}
        {activeTab === 'orders' && (
          <>
            <div className="dash-section-header">
              <h2 className="dash-section-title">💳 All Orders <span className="dash-section-count">{allOrders.length}</span></h2>
            </div>
            {/* Revenue summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '12px', marginBottom: '24px' }}>
              {[
                { label: 'Total Orders', val: allOrders.length, col: 'var(--text-primary)' },
                { label: 'Paid Orders', val: paidOrders.length, col: 'var(--success)' },
                { label: 'Total Revenue', val: `₦${totalRevenue.toLocaleString()}`, col: 'var(--gold)' },
                { label: 'Pending Payment', val: allOrders.filter(o => o.paymentStatus !== 'Paid').length, col: 'var(--warning)' },
              ].map(s => (
                <div key={s.label} className="glass-panel" style={{ padding: '16px 18px', borderRadius: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: s.col }}>{s.val}</div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>
            {filteredOrders.length > 0 ? (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color)' }}>
                        {['Product', 'Buyer', 'Seller', 'Amount', 'Payment', 'Escrow'].map(h => (
                          <th key={h} style={{ padding: '12px 14px', color: 'var(--gold)', textAlign: 'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(o => (
                        <tr key={o._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '11px 14px', color: 'var(--text-primary)', fontWeight: '600' }}>{o.product ? o.product.name : 'Deleted'}</td>
                          <td style={{ padding: '11px 14px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{o.buyer?.name || '—'}<br /><span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{o.buyer?.email}</span></td>
                          <td style={{ padding: '11px 14px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{o.seller?.name || '—'}<br /><span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{o.seller?.email}</span></td>
                          <td style={{ padding: '11px 14px', color: 'var(--gold)', fontWeight: '700' }}>₦{o.amount?.toLocaleString()}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '600', background: o.paymentStatus === 'Paid' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: o.paymentStatus === 'Paid' ? 'var(--success)' : 'var(--warning)' }}>
                              {o.paymentStatus}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '600', background: o.escrowStatus === 'Released' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)', color: o.escrowStatus === 'Released' ? 'var(--success)' : 'var(--gold)' }}>
                              {o.escrowStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="dash-empty">
                <div className="dash-empty-icon">💳</div>
                <p className="dash-empty-title">No matching orders</p>
                <p className="dash-empty-sub">Try refining your filter text.</p>
              </div>
            )}
          </>
        )}


      </main>

      {/* ID Card Modal */}
      {selectedDocUser && (
        <div className="profile-modal-overlay" onClick={() => setSelectedDocUser(null)}>
          <div className="profile-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="profile-modal-header">
              <h3 className="profile-modal-title">Student ID — {selectedDocUser.name}</h3>
              <button className="profile-modal-close" onClick={() => setSelectedDocUser(null)}>✕</button>
            </div>
            <div className="profile-modal-body" style={{ alignItems: 'center', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Matric: <strong>{selectedDocUser.matricNumber || 'Not provided'}</strong></p>
              <img src={selectedDocUser.studentIdCard} alt="Student ID" style={{ width: '100%', maxHeight: '380px', objectFit: 'contain', borderRadius: '10px', border: '1px solid var(--border-color)' }} />
            </div>
            <div className="profile-modal-footer">
              <button onClick={() => setSelectedDocUser(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Close</button>
              {!selectedDocUser.isVerifiedStudent && (
                <button onClick={() => { handleToggleVerification(selectedDocUser._id); setSelectedDocUser(null); }} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>🎓 Approve</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav for Admin */}
      <div className="dash-mobile-toggle">
        <div className="dash-mobile-nav">
          {navTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`dash-mobile-nav-item${activeTab === tab.id ? ' active' : ''}`}>
              <span className="dash-mobile-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
