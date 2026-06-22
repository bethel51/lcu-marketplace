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
            <button onClick={() => setShowVerifyForm(true)} className="btn-primary" style={{ padding:'9px 20px', fontSize:'0.85rem' }}>
              🎓 Get Verified
            </button>
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

        {/* LEFT SIDEBAR */}
        <aside className="db-sidebar-card">
          {/* User info */}
          <div className="db-sidebar-section">
            <p className="db-sidebar-section-title">My Profile</p>
            <div className="db-info-row">
              <span className="db-info-label">Full Name</span>
              <span className="db-info-value">{profileData?.name || user?.name}</span>
            </div>
            <div className="db-info-row">
              <span className="db-info-label">Email</span>
              <span className="db-info-value" style={{ fontSize:'0.82rem', wordBreak:'break-all' }}>{user?.email}</span>
            </div>
            <div className="db-info-row">
              <span className="db-info-label">Matric Number</span>
              <span className="db-info-value">{profileData?.matricNumber || '—'}</span>
            </div>
            <div className="db-info-row">
              <span className="db-info-label">Department</span>
              <span className="db-info-value">{profileData?.department || '—'}</span>
            </div>
            <div className="db-info-row">
              <span className="db-info-label">Hostel / Location</span>
              <span className="db-info-value">{profileData?.hostel || '—'}</span>
            </div>
            <div className="db-info-row">
              <span className="db-info-label">Phone</span>
              <span className="db-info-value">{profileData?.phoneNumber || '—'}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="db-sidebar-section">
            <p className="db-sidebar-section-title">Quick Actions</p>
            <div className="db-quick-actions">
              <Link to="/post" className="db-quick-btn primary">
                <span className="db-quick-btn-icon">＋</span> Post a New Listing
              </Link>
              <Link to="/chat" className="db-quick-btn">
                <span className="db-quick-btn-icon">💬</span> Messages Inbox
              </Link>
              <Link to="/" className="db-quick-btn">
                <span className="db-quick-btn-icon">🛍️</span> Browse Marketplace
              </Link>
            </div>
          </div>

          {/* Account status */}
          <div className="db-sidebar-section">
            <p className="db-sidebar-section-title">Account Status</p>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:'0.82rem', color:'var(--text-secondary)' }}>Email Verified</span>
                <span style={{ fontSize:'0.8rem', fontWeight:'700', color: user?.isEmailVerified ? 'var(--success)' : 'var(--error)' }}>
                  {user?.isEmailVerified ? '✓ Yes' : '✗ No'}
                </span>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:'0.82rem', color:'var(--text-secondary)' }}>Student Badge</span>
                <span style={{ fontSize:'0.8rem', fontWeight:'700', color: user?.isVerifiedStudent ? 'var(--success)' : 'var(--warning)' }}>
                  {user?.isVerifiedStudent ? '✓ Verified' : '⏳ Pending'}
                </span>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:'0.82rem', color:'var(--text-secondary)' }}>Total Listings</span>
                <span style={{ fontSize:'0.8rem', fontWeight:'700', color:'var(--text-primary)' }}>{myProducts.length}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT MAIN CONTENT */}
        <main>
          {/* Tabs */}
          <div className="db-tabs">
            {[
              { id: 'listings', label: `📦 My Listings (${myProducts.length})` },
              { id: 'wishlist', label: `❤️ Wishlist (${wishCount})` },
              { id: 'settings', label: '⚙️ Profile Settings' },
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
                      <div className="db-product-meta">
                        <span>📍 {p.hostelLocation}</span>
                        <span className={`db-status-badge ${p.status === 'Sold' ? 'sold' : 'available'}`}>{p.status}</span>
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

          {/* ── SETTINGS TAB ─────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div style={{ background:'var(--card-bg)', border:'1px solid var(--glass-border)', borderRadius:'var(--border-radius)', overflow:'hidden' }}>
              {/* Header */}
              <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--tab-border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <h3 style={{ fontSize:'1.05rem', color:'var(--text-primary)', fontWeight:'700' }}>Profile Settings</h3>
                  <p style={{ fontSize:'0.82rem', color:'var(--text-secondary)', marginTop:'3px' }}>Update your hostel, faculty, and contact info</p>
                </div>
                <button
                  onClick={handleSaveSettings}
                  disabled={editSaving}
                  className="btn-primary"
                  style={{ padding:'9px 22px', fontSize:'0.88rem' }}
                >
                  {editSaving ? 'Saving…' : '💾 Save Changes'}
                </button>
              </div>

              {/* Form */}
              <div style={{ padding:'24px' }}>
                {/* Read-only info */}
                <p style={{ fontSize:'0.75rem', fontWeight:'700', letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:'14px' }}>Account Info (Read Only)</p>
                <div className="db-settings-grid" style={{ marginBottom:'28px' }}>
                  <div className="db-settings-field">
                    <label className="db-settings-label">Full Name</label>
                    <div className="db-settings-value">{profileData?.name || user?.name}</div>
                  </div>
                  <div className="db-settings-field">
                    <label className="db-settings-label">Email Address</label>
                    <div className="db-settings-value" style={{ fontSize:'0.85rem' }}>{user?.email}</div>
                  </div>
                  <div className="db-settings-field">
                    <label className="db-settings-label">Matric Number</label>
                    <div className="db-settings-value">{profileData?.matricNumber || '—'}</div>
                  </div>
                  <div className="db-settings-field">
                    <label className="db-settings-label">Account Role</label>
                    <div className="db-settings-value">{user?.isAdmin ? '🔑 Administrator' : '🎓 Student'}</div>
                  </div>
                </div>

                {/* Editable fields */}
                <p style={{ fontSize:'0.75rem', fontWeight:'700', letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:'14px' }}>Edit Info</p>
                <div className="db-settings-grid">
                  <div className="db-settings-field">
                    <label className="db-settings-label">Hostel / Location</label>
                    <select value={editHostel} onChange={e => setEditHostel(e.target.value)} className="glass-input" style={{ padding:'11px 14px' }}>
                      {HOSTELS.map(h => <option key={h} value={h} style={{ background:'var(--bg-input)', color:'var(--text-primary)' }}>{h}</option>)}
                    </select>
                  </div>
                  <div className="db-settings-field">
                    <label className="db-settings-label">Phone Number</label>
                    <input
                      type="tel" maxLength="11" placeholder="e.g. 08012345678"
                      value={editPhone} onChange={e => setEditPhone(e.target.value.replace(/\D/g, ''))}
                      className="glass-input" style={{ padding:'11px 14px' }}
                    />
                  </div>
                  <div className="db-settings-field">
                    <label className="db-settings-label">Faculty</label>
                    <select value={editFaculty} onChange={e => { setEditFaculty(e.target.value); setEditDept(''); }} className="glass-input" style={{ padding:'11px 14px' }}>
                      {FACULTIES.map(f => <option key={f} value={f} style={{ background:'var(--bg-input)', color:'var(--text-primary)' }}>{f}</option>)}
                    </select>
                  </div>
                  <div className="db-settings-field">
                    <label className="db-settings-label">Department</label>
                    <select value={editDept} onChange={e => setEditDept(e.target.value)} className="glass-input" style={{ padding:'11px 14px' }}>
                      <option value="" style={{ background:'var(--bg-input)', color:'var(--text-primary)' }}>— Select —</option>
                      {currentDepts.map(d => <option key={d} value={d} style={{ background:'var(--bg-input)', color:'var(--text-primary)' }}>{d}</option>)}
                    </select>
                  </div>
                </div>

                {/* Password change hint */}
                <div style={{ marginTop:'28px', padding:'16px 20px', background:'var(--metric-1-bg)', border:'1px solid var(--metric-1-border)', borderRadius:'10px', display:'flex', alignItems:'center', gap:'12px' }}>
                  <span style={{ fontSize:'1.3rem' }}>🔒</span>
                  <div>
                    <p style={{ fontSize:'0.85rem', fontWeight:'600', color:'var(--text-primary)' }}>Password Change</p>
                    <p style={{ fontSize:'0.78rem', color:'var(--text-secondary)', marginTop:'2px' }}>
                      To change your password, logout and use the "Forgot Password" option on the login page.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
