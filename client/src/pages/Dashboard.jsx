import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config';
import { VerifiedBadge } from '../components/ProductCard';

const HOSTELS = [
  'Bronze Hostel','Silver Hostel','Gold Hostel','Platinum Hostel',
  'Jasper Hall','Emerald Hall','Pearl Hall','Sapphire Hall','Off-Campus'
];
const FACULTIES = [
  'Information Technology & Applied Sciences',
  'Basic Medical & Health Sciences',
  'Social & Management Sciences',
  'Arts, Education & Humanities',
  'Law'
];
const DEPTS_BY_FACULTY = {
  'Information Technology & Applied Sciences': ['Computer Science','Information Technology','Cyber Security','Software Engineering','Biochemistry','Industrial Chemistry','Microbiology','Physics with Electronics'],
  'Basic Medical & Health Sciences': ['Medicine & Surgery','Nursing Science','Medical Laboratory Science','Pharmacology','Physiotherapy','Public Health'],
  'Social & Management Sciences': ['Accounting','Banking & Finance','Business Administration','Economics','Mass Communication','Political Science','Sociology'],
  'Arts, Education & Humanities': ['English Language','History & International Studies','Philosophy','Education & English','Education & Mathematics'],
  'Law': ['Law'],
};

export default function Dashboard() {
  const { user, token, fetchProfile, verifyStudent } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [profileData, setProfileData]   = useState(null);
  const [myProducts,  setMyProducts]    = useState([]);
  const [loading,     setLoading]       = useState(true);
  const [activeTab,   setActiveTab]     = useState('listings');
  const [orders,      setOrders]        = useState({ bought: [], sold: [] });

  // ── Profile-settings state ──────────────────────────────────
  const [editHostel,      setEditHostel]      = useState('Off-Campus');
  const [editFaculty,     setEditFaculty]     = useState(FACULTIES[0]);
  const [editDept,        setEditDept]        = useState('');
  const [editPhone,       setEditPhone]       = useState('');
  const [editSaving,      setEditSaving]      = useState(false);

  // ── Verification state ──────────────────────────────────────
  const [showVerifyForm,  setShowVerifyForm]  = useState(false);
  const [matricInput,     setMatricInput]     = useState('');
  const [idCardFile,      setIdCardFile]      = useState(null);
  const [idCardLabel,     setIdCardLabel]     = useState('');

  // ─────────────────────────────────────────────────────────────
  const loadDashboard = async () => {
    setLoading(true);
    try {
      const profile = await fetchProfile();
      if (profile) {
        setProfileData(profile);
        setEditHostel(profile.hostel || 'Off-Campus');
        setEditFaculty(profile.faculty || FACULTIES[0]);
        setEditDept(profile.department || '');
        setEditPhone(profile.phoneNumber || '');
      }
      if (user?._id) {
        const res = await fetch(`${API_URL}/api/products?status=All`);
        if (res.ok) {
          const all = await res.json();
          setMyProducts(all.filter(p => p.seller?._id === user._id || p.seller === user._id));
        }

        // Fetch user orders/transactions
        const ordersRes = await fetch(`${API_URL}/api/payments/my-orders`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(ordersData);
        }
      }
    } catch {
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) loadDashboard(); }, [token]);

  // ── Save profile settings ────────────────────────────────────
  const handleSaveSettings = async () => {
    if (!token) return;
    setEditSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ hostel: editHostel, faculty: editFaculty, department: editDept, phoneNumber: editPhone })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Profile updated successfully! 🎓', 'success');
        loadDashboard();
      } else {
        showToast(data.message || 'Update failed', 'error');
      }
    } catch {
      showToast('Error updating profile', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  // ── Verify student ────────────────────────────────────────────
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!matricInput.trim()) return;
    await verifyStudent(idCardFile);
    showToast('Verification request submitted! 🎓', 'success');
    setShowVerifyForm(false);
    setMatricInput(''); setIdCardFile(null); setIdCardLabel('');
    loadDashboard();
  };

  // ── Listing actions ───────────────────────────────────────────
  const handleToggleSold = async (id, status) => {
    const next = status === 'Available' ? 'Sold' : 'Available';
    try {
      const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: next })
      });
      if (res.ok) { showToast(`Marked as ${next}! 🤝`, 'success'); loadDashboard(); }
    } catch { showToast('Failed to update status', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listing permanently?')) return;
    try {
      const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { showToast('Listing deleted!', 'success'); loadDashboard(); }
    } catch { showToast('Failed to delete', 'error'); }
  };

  const handleConfirmDelivery = async (orderId) => {
    if (!window.confirm('Have you physically received the product? This will permanently release the escrowed funds to the seller.')) return;
    try {
      const res = await fetch(`${API_URL}/api/payments/confirm-delivery/${orderId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Escrow funds released to the seller! 🤝', 'success');
        loadDashboard();
      } else {
        showToast(data.message || 'Failed to release funds', 'error');
      }
    } catch {
      showToast('Error releasing funds', 'error');
    }
  };

  const handleBoostListing = async (productId) => {
    try {
      const response = await fetch(`${API_URL}/api/payments/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderType: 'boost',
          productId
        })
      });
      const resData = await response.json();
      if (!response.ok) {
        showToast(resData.message || 'Boost initialization failed', 'error');
        return;
      }
      const { txRef, amount, email, name, phoneNumber, flwPublicKey } = resData;

      window.FlutterwaveCheckout({
        public_key: flwPublicKey,
        tx_ref: txRef,
        amount: amount,
        currency: 'NGN',
        payment_options: 'card, banktransfer, ussd',
        customer: { email, phone_number: phoneNumber, name },
        customizations: {
          title: 'LCU Marketplace listing Boost',
          description: 'Promote your listing on LCU Marketplace for 7 days',
        },
        callback: async (paymentRes) => {
          try {
            const verifyResponse = await fetch(`${API_URL}/api/payments/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                transactionId: paymentRes.transaction_id,
                txRef
              })
            });
            if (verifyResponse.ok) {
              showToast('Listing boosted successfully! 🚀', 'success');
              loadDashboard();
            } else {
              showToast('Verification failed', 'error');
            }
          } catch (err) {
            showToast('Verification request failed', 'error');
          }
        }
      });
    } catch {
      showToast('Error initializing boost payment', 'error');
    }
  };

  const handlePayVerificationFee = async () => {
    try {
      const response = await fetch(`${API_URL}/api/payments/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderType: 'verification'
        })
      });
      const resData = await response.json();
      if (!response.ok) {
        showToast(resData.message || 'Verification initialization failed', 'error');
        return;
      }
      const { txRef, amount, email, name, phoneNumber, flwPublicKey } = resData;

      window.FlutterwaveCheckout({
        public_key: flwPublicKey,
        tx_ref: txRef,
        amount: amount,
        currency: 'NGN',
        payment_options: 'card, banktransfer, ussd',
        customer: { email, phone_number: phoneNumber, name },
        customizations: {
          title: 'LCU Student Verification',
          description: 'One-time verification fee for verified student badge',
        },
        callback: async (paymentRes) => {
          try {
            const verifyResponse = await fetch(`${API_URL}/api/payments/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                transactionId: paymentRes.transaction_id,
                txRef
              })
            });
            if (verifyResponse.ok) {
              showToast('Verification fee paid and account verified! 🎓', 'success');
              loadDashboard();
            } else {
              showToast('Verification failed', 'error');
            }
          } catch (err) {
            showToast('Verification request failed', 'error');
          }
        }
      });
    } catch {
      showToast('Error initializing verification payment', 'error');
    }
  };

  // ── Derived stats ─────────────────────────────────────────────
  const activeCount  = myProducts.filter(p => p.status === 'Available').length;
  const soldCount    = myProducts.filter(p => p.status === 'Sold').length;
  const wishCount    = profileData?.wishlist?.length || 0;
  const ratings      = profileData?.ratings || [];
  const avgRating    = ratings.length > 0
    ? (ratings.reduce((a,c) => a + c.rating, 0) / ratings.length).toFixed(1)
    : '—';

  // ── Loading ───────────────────────────────────────────────────
  if (loading) return (
    <div style={{ height:'60vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'16px' }} className="container">
      <div style={{ width:'44px', height:'44px', border:'4px solid var(--border-color)', borderTop:'4px solid var(--gold)', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <p style={{ color:'var(--text-secondary)', fontSize:'0.9rem' }}>Loading your dashboard…</p>
    </div>
  );

  const currentDepts = DEPTS_BY_FACULTY[editFaculty] || [];

  return (
    <div className="container animate-fade-in" style={{ paddingTop:'28px', paddingBottom:'60px' }}>

      {/* ── Welcome Header ─────────────────────────────────── */}
      <header className="db-header">
        <div className="db-header-left">
          <div className="db-avatar-container">
            <div className="db-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
          </div>
          <div>
            <h1 className="db-welcome-title">Hey, {user?.name?.split(' ')[0]}! 👋</h1>
            <p className="db-welcome-sub">Lead City University Student Hub</p>
            <div className="db-welcome-meta">
              <span className="db-meta-chip">📧 {user?.email}</span>
              {profileData?.faculty && <span className="db-meta-chip">🏛️ {profileData.faculty}</span>}
              {profileData?.matricNumber && <span className="db-meta-chip">🪪 {profileData.matricNumber}</span>}
            </div>
          </div>
        </div>

        <div className="db-verify-box">
          {user?.isVerifiedStudent ? (
            <VerifiedBadge size="lg" />
          ) : showVerifyForm ? (
            <form onSubmit={handleVerifySubmit} style={{ display:'flex', flexDirection:'column', gap:'8px', alignItems:'flex-end' }}>
              <input
                type="text" required placeholder="Your matric number"
                value={matricInput} onChange={e => setMatricInput(e.target.value)}
                className="glass-input" style={{ width:'220px', padding:'8px 12px', fontSize:'0.85rem' }}
              />
              <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                <label htmlFor="id-upload" style={{ padding:'7px 12px', border:'1px dashed var(--border-color)', borderRadius:'7px', fontSize:'0.8rem', cursor:'pointer', color:'var(--text-secondary)', background:'var(--bg-input)', whiteSpace:'nowrap' }}>
                  {idCardLabel || '📎 Upload ID Card'}
                </label>
                <input id="id-upload" type="file" accept="image/*" style={{ display:'none' }} onChange={e => { setIdCardFile(e.target.files[0]); setIdCardLabel(e.target.files[0]?.name || ''); }} />
                <button type="submit" className="btn-primary" style={{ padding:'7px 14px', fontSize:'0.82rem' }}>Submit</button>
                <button type="button" onClick={() => setShowVerifyForm(false)} className="btn-secondary" style={{ padding:'7px 12px', fontSize:'0.82rem' }}>✕</button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
              <button onClick={() => setShowVerifyForm(true)} className="btn-secondary" style={{ padding:'6px 14px', fontSize:'0.8rem' }}>
                📎 Submit ID Form
              </button>
              <button onClick={handlePayVerificationFee} className="btn-primary" style={{ padding:'9px 20px', fontSize:'0.85rem' }}>
                🎓 Get Instant Verified (₦1,000)
              </button>
            </div>
          )}
          {!user?.isVerifiedStudent && (
            <p style={{ fontSize:'0.73rem', color:'var(--text-muted)', textAlign:'right', maxWidth:'220px' }}>
              Upload your student ID to get a verified badge
            </p>
          )}
        </div>
      </header>

      {/* ── Metrics ────────────────────────────────────────── */}
      <section className="db-metrics">
        <div className="db-metric-card">
          <div className="db-metric-icon">📦</div>
          <div><div className="db-metric-value">{activeCount}</div><div className="db-metric-label">Active Listings</div></div>
        </div>
        <div className="db-metric-card">
          <div className="db-metric-icon">🤝</div>
          <div><div className="db-metric-value">{soldCount}</div><div className="db-metric-label">Items Sold</div></div>
        </div>
        <div className="db-metric-card">
          <div className="db-metric-icon">❤️</div>
          <div><div className="db-metric-value">{wishCount}</div><div className="db-metric-label">Wishlist Items</div></div>
        </div>
        <div className="db-metric-card">
          <div className="db-metric-icon">⭐</div>
          <div><div className="db-metric-value">{avgRating}</div><div className="db-metric-label">Seller Rating</div></div>
        </div>
      </section>

      {/* ── Main layout ─────────────────────────────────────── */}
      <div className="profile-grid" style={{ marginTop:'24px', alignItems:'start' }}>

        {/* ═══════════════════ LEFT SIDEBAR ═══════════════════ */}
        <aside className="db-sidebar-card">

          {/* ── Profile header ──────────────────────────────── */}
          <div className="db-sidebar-section" style={{ textAlign:'center', paddingBottom:'24px' }}>
            <div style={{ width:'76px', height:'76px', borderRadius:'50%', background:'linear-gradient(135deg, var(--secondary-blue) 0%, var(--gold) 100%)', border:'3px solid var(--border-strong)', color:'#fff', fontSize:'2rem', fontWeight:'800', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', boxShadow:'0 6px 20px rgba(59,130,246,0.3)' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <h3 style={{ fontSize:'1.1rem', fontWeight:'800', color:'var(--text-primary)', marginBottom:'3px' }}>{profileData?.name || user?.name}</h3>
            <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:'10px', wordBreak:'break-all' }}>{user?.email}</p>
            {/* Status badges */}
            <div style={{ display:'flex', gap:'6px', justifyContent:'center', flexWrap:'wrap' }}>
              {user?.isEmailVerified
                ? <span style={{ fontSize:'0.7rem', fontWeight:'700', padding:'3px 10px', borderRadius:'999px', background:'rgba(16,185,129,0.12)', color:'var(--success)', border:'1px solid rgba(16,185,129,0.3)' }}>✉️ Email Verified</span>
                : <span style={{ fontSize:'0.7rem', fontWeight:'700', padding:'3px 10px', borderRadius:'999px', background:'rgba(239,68,68,0.1)', color:'var(--error)', border:'1px solid rgba(239,68,68,0.25)' }}>✉️ Unverified</span>
              }
              {user?.isVerifiedStudent
                ? <span style={{ fontSize:'0.7rem', fontWeight:'700', padding:'3px 10px', borderRadius:'999px', background:'rgba(59,130,246,0.12)', color:'var(--gold)', border:'1px solid rgba(59,130,246,0.25)' }}>🎓 LCU Verified</span>
                : <span style={{ fontSize:'0.7rem', fontWeight:'700', padding:'3px 10px', borderRadius:'999px', background:'rgba(245,158,11,0.1)', color:'var(--warning)', border:'1px solid rgba(245,158,11,0.25)' }}>⏳ Unverified</span>
              }
              {user?.isAdmin && <span style={{ fontSize:'0.7rem', fontWeight:'700', padding:'3px 10px', borderRadius:'999px', background:'rgba(239,68,68,0.12)', color:'#f87171', border:'1px solid rgba(239,68,68,0.25)' }}>🔑 Admin</span>}
            </div>
          </div>

          {/* ── Info rows ────────────────────────────────────── */}
          <div className="db-sidebar-section">
            <p className="db-sidebar-section-title">Profile Information</p>
            {[
              { icon:'🪪', label:'Matric No.', value: profileData?.matricNumber || '—' },
              { icon:'🏛️', label:'Faculty',    value: profileData?.faculty || '—' },
              { icon:'📚', label:'Department', value: profileData?.department || '—' },
              { icon:'🏠', label:'Hostel',     value: profileData?.hostel || '—' },
              { icon:'📞', label:'Phone',      value: profileData?.phoneNumber || '—' },
            ].map(row => (
              <div key={row.label} className="db-info-row">
                <span className="db-info-label">{row.icon} {row.label}</span>
                <span className="db-info-value" style={{ maxWidth:'140px', textAlign:'right', fontSize:'0.82rem', wordBreak:'break-word' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* ── Wallet Balance ─────────────────────────────────── */}
          <div className="db-sidebar-section">
            <p className="db-sidebar-section-title">Escrow Wallet Balance</p>
            <div style={{ padding: '12px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--gold)' }}>₦{(profileData?.walletBalance || 0).toLocaleString()}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '2px 6px', background: 'rgba(16,185,129,0.15)', color: 'var(--success)', borderRadius: '4px' }}>Active</span>
            </div>
          </div>

          {/* ── Quick Actions ─────────────────────────────────── */}
          <div className="db-sidebar-section">
            <p className="db-sidebar-section-title">Quick Actions</p>
            <div className="db-quick-actions">
              <Link to="/post" className="db-quick-btn primary">
                <span className="db-quick-btn-icon">＋</span> Post a New Listing
              </Link>
              <Link to="/chat" className="db-quick-btn">
                <span className="db-quick-btn-icon">💬</span> Messages Inbox
              </Link>
              <Link to="/marketplace" className="db-quick-btn">
                <span className="db-quick-btn-icon">🛍️</span> Browse Marketplace
              </Link>
            </div>
          </div>

          {/* ── Stats ────────────────────────────────────────── */}
          <div className="db-sidebar-section" style={{ borderBottom:'none' }}>
            <p className="db-sidebar-section-title">Account Stats</p>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {[
                { label:'Active Listings', value: myProducts.filter(p => p.status === 'Available').length, color:'var(--metric-1-color)' },
                { label:'Items Sold',      value: myProducts.filter(p => p.status === 'Sold').length,      color:'var(--metric-2-color)' },
                { label:'Wishlist Items',  value: wishCount, color:'var(--metric-3-color)' },
                { label:'Seller Rating',   value: avgRating,  color:'var(--metric-4-color)' },
              ].map(stat => (
                <div key={stat.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'0.8rem', color:'var(--text-secondary)' }}>{stat.label}</span>
                  <span style={{ fontSize:'0.88rem', fontWeight:'800', color: stat.color }}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

        </aside>

        {/* RIGHT MAIN CONTENT */}
        <main>
          {/* Tabs — settings removed (use Edit Profile in navbar) */}
          <div className="db-tabs">
            {[
              { id: 'listings', label: `📦 My Listings (${myProducts.length})` },
              { id: 'orders', label: `💳 Transactions (${(orders.bought?.length || 0) + (orders.sold?.length || 0)})` },
              { id: 'wishlist', label: `❤️ Wishlist (${wishCount})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`db-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── LISTINGS TAB ─────────────────────────────────── */}
          {activeTab === 'listings' && (
            myProducts.length > 0 ? (
              <div className="db-card-list">
                {myProducts.map(p => (
                  <div key={p._id} className="db-product-card">
                    {p.image
                      ? <img src={p.image} alt={p.name} className="db-product-image" />
                      : <div className="db-product-placeholder">🖼️</div>
                    }
                    <div className="db-product-info">
                      <h4 className="db-product-title">{p.name}</h4>
                      <span className="db-product-price">₦{p.price.toLocaleString()}</span>
                      <div className="db-product-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <span>📍 {p.hostelLocation}</span>
                        <span className={`db-status-badge ${p.status === 'Sold' ? 'sold' : 'available'}`}>{p.status}</span>
                        {p.isBoosted ? (
                          <span style={{ fontSize: '0.7rem', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: 'rgba(212,175,55,0.15)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.3)' }}>🚀 Boosted</span>
                        ) : (
                          p.status !== 'Sold' && (
                            <button
                              onClick={() => handleBoostListing(p._id)}
                              style={{ border: 'none', background: 'none', color: 'var(--gold)', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                            >
                              🚀 Boost Listing (₦500)
                            </button>
                          )
                        )}
                      </div>
                    </div>
                    <div className="db-actions">
                      <button
                        onClick={() => handleToggleSold(p._id, p.status)}
                        className="btn-secondary"
                        style={{ padding:'8px 14px', fontSize:'0.8rem', whiteSpace:'nowrap',
                          color: p.status === 'Sold' ? 'var(--success)' : 'var(--text-secondary)',
                          borderColor: p.status === 'Sold' ? 'rgba(16,185,129,0.4)' : 'var(--border-color)'
                        }}
                      >
                        {p.status === 'Sold' ? '↩ Relist' : '✓ Mark Sold'}
                      </button>
                      <Link
                        to={`/edit/${p._id}`}
                        className="btn-secondary"
                        style={{ padding:'8px 14px', fontSize:'0.8rem' }}
                      >
                        ✏️ Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(p._id)}
                        className="btn-danger"
                        style={{ padding:'8px 14px' }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="db-empty-state">
                <div className="db-empty-icon">📭</div>
                <p className="db-empty-title">No listings yet</p>
                <p style={{ fontSize:'0.85rem', marginBottom:'20px' }}>Start selling by posting your first product on the marketplace.</p>
                <Link to="/post" className="btn-primary">+ Post a Listing</Link>
              </div>
            )
          )}

          {/* ── ORDERS TAB ────────────────────────────────────── */}
          {activeTab === 'orders' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--gold)', marginBottom: '12px', fontWeight: '700' }}>🛒 Items Purchased (Escrow)</h3>
                {orders.bought?.length > 0 ? (
                  <div className="db-card-list">
                    {orders.bought.map(o => (
                      <div key={o._id} className="db-product-card" style={{ borderLeft: '3px solid var(--gold)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="db-product-info">
                          <h4 className="db-product-title">{o.product ? o.product.name : 'Deleted Product'}</h4>
                          <span className="db-product-price">₦{o.amount.toLocaleString()}</span>
                          <div className="db-product-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            <span>Seller: {o.seller?.name || 'Unknown'}</span>
                            <span>Ref: {o.txRef}</span>
                            <span style={{ fontWeight: '700', color: o.paymentStatus === 'Paid' ? 'var(--success)' : 'var(--warning)' }}>
                              Payment: {o.paymentStatus}
                            </span>
                            <span style={{ fontWeight: '700', color: o.escrowStatus === 'Released' ? 'var(--success)' : 'var(--gold)' }}>
                              Escrow: {o.escrowStatus}
                            </span>
                          </div>
                        </div>
                        {o.paymentStatus === 'Paid' && o.escrowStatus === 'Held' && (
                          <div className="db-actions">
                            <button
                              onClick={() => handleConfirmDelivery(o._id)}
                              className="btn-primary"
                              style={{ padding: '8px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                            >
                              🤝 Release Funds
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>You haven't bought any items yet.</p>
                )}
              </div>

              <div>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--gold)', marginBottom: '12px', fontWeight: '700' }}>💰 Items Sold (Escrow Earnings)</h3>
                {orders.sold?.length > 0 ? (
                  <div className="db-card-list">
                    {orders.sold.map(o => (
                      <div key={o._id} className="db-product-card" style={{ borderLeft: '3px solid var(--success)' }}>
                        <div className="db-product-info">
                          <h4 className="db-product-title">{o.product ? o.product.name : 'Deleted Product'}</h4>
                          <span className="db-product-price">₦{o.amount.toLocaleString()}</span>
                          <div className="db-product-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            <span>Buyer: {o.buyer?.name || 'Unknown'}</span>
                            <span>Ref: {o.txRef}</span>
                            <span style={{ fontWeight: '700', color: o.paymentStatus === 'Paid' ? 'var(--success)' : 'var(--warning)' }}>
                              Payment: {o.paymentStatus}
                            </span>
                            <span style={{ fontWeight: '700', color: o.escrowStatus === 'Released' ? 'var(--success)' : 'var(--gold)' }}>
                              Escrow: {o.escrowStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No items sold through escrow yet.</p>
                )}
              </div>
            </div>
          )}

          {/* ── WISHLIST TAB ──────────────────────────────────── */}
          {activeTab === 'wishlist' && (
            profileData?.wishlist?.length > 0 ? (
              <div className="db-card-list">
                {profileData.wishlist.map(p => (
                  <div key={p._id} className="db-product-card">
                    {p.image
                      ? <img src={p.image} alt={p.name} className="db-product-image" />
                      : <div className="db-product-placeholder">🖼️</div>
                    }
                    <div className="db-product-info">
                      <h4 className="db-product-title">{p.name}</h4>
                      <span className="db-product-price">₦{p.price?.toLocaleString()}</span>
                      <div className="db-product-meta"><span>📍 {p.hostelLocation}</span></div>
                    </div>
                    <div className="db-actions">
                      <Link to={`/product/${p._id}`} className="btn-primary" style={{ padding:'8px 16px', fontSize:'0.82rem' }}>
                        View →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="db-empty-state">
                <div className="db-empty-icon">💔</div>
                <p className="db-empty-title">Your wishlist is empty</p>
                <p style={{ fontSize:'0.85rem', marginBottom:'20px' }}>Browse the marketplace and save items you love.</p>
                <Link to="/" className="btn-secondary">🛍️ Browse Marketplace</Link>
              </div>
            )
          )}

          {/* Settings tab removed — use "Edit Profile" from the Navbar dropdown */}
        </main>
      </div>
    </div>
  );
}
