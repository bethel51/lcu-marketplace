import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

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

/* ─── Edit Profile Modal ─────────────────────────────────────── */
function EditProfileModal({ isOpen, onClose }) {
  const { user, updateProfile, fetchProfile } = useAuth();
  const [name, setName] = React.useState('');
  const [hostel, setHostel] = React.useState('Off-Campus');
  const [faculty, setFaculty] = React.useState(FACULTIES[0]);
  const [department, setDepartment] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (user && isOpen) {
      setName(user.name || '');
      setHostel(user.hostel || 'Off-Campus');
      setFaculty(user.faculty || FACULTIES[0]);
      setDepartment(user.department || '');
      setPhoneNumber(user.phoneNumber || '');
      setError('');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateProfile({ name, hostel, faculty, department, phoneNumber });
      await fetchProfile();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const departments = DEPTS_BY_FACULTY[faculty] || [];

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal-content" onClick={e => e.stopPropagation()}>
        <div className="profile-modal-header">
          <h3 className="profile-modal-title">Edit Profile</h3>
          <button className="profile-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="profile-modal-body">
            {error && <div style={{ color: 'var(--error)', fontSize: '0.85rem' }}>{error}</div>}
            <div className="profile-modal-field">
              <label className="profile-modal-label">Full Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="glass-input" />
            </div>
            <div className="profile-modal-field">
              <label className="profile-modal-label">Phone Number</label>
              <input type="tel" maxLength="11" placeholder="e.g. 08012345678" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))} className="glass-input" />
            </div>
            <div className="profile-modal-field">
              <label className="profile-modal-label">Hostel / Location</label>
              <select value={hostel} onChange={e => setHostel(e.target.value)} className="glass-input">
                {HOSTELS.map(h => <option key={h} value={h} style={{ background:'var(--bg-input)' }}>{h}</option>)}
              </select>
            </div>
            <div className="profile-modal-field">
              <label className="profile-modal-label">Faculty</label>
              <select value={faculty} onChange={e => { setFaculty(e.target.value); setDepartment(''); }} className="glass-input">
                {FACULTIES.map(f => <option key={f} value={f} style={{ background:'var(--bg-input)' }}>{f}</option>)}
              </select>
            </div>
            <div className="profile-modal-field">
              <label className="profile-modal-label">Department</label>
              <select value={department} onChange={e => setDepartment(e.target.value)} className="glass-input">
                <option value="" style={{ background:'var(--bg-input)' }}>— Select —</option>
                {departments.map(d => <option key={d} value={d} style={{ background:'var(--bg-input)' }}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="profile-modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main Navbar ────────────────────────────────────────────── */
export default function Navbar() {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllRead, clearNotifications } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);
  const notifRef = React.useRef(null);
  const [theme, setTheme] = React.useState(() => localStorage.getItem('theme') || 'light');

  React.useEffect(() => {
    document.body.classList.toggle('light-theme', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  React.useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNotifOpen = () => {
    setNotifOpen(prev => !prev);
    if (!notifOpen) markAllRead();
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  // Hide entire nav on admin pages
  if (user?.isAdmin) {
    return (
      <nav className="top-nav glass-panel">
        <div className="top-nav-container">
          <Link to="/admin" className="nav-brand">
            <img src="/logo.png" alt="LCU Logo" width="34" height="34" className="nav-logo-img" style={{ borderRadius:'50%', border:'2px solid rgba(59,130,246,0.5)' }} />
            <div className="nav-brand-text">
              <span className="nav-brand-title">Lead City</span>
              <span className="nav-brand-sub">ADMIN</span>
            </div>
          </Link>
          <button onClick={handleLogout} className="btn-danger" style={{ padding:'8px 16px', fontSize:'0.82rem' }}>🚪 Logout</button>
        </div>
      </nav>
    );
  }

  return (
    <>
      {/* ═══════════════════════════════════════════════════════
          TOP APP BAR
          ═══════════════════════════════════════════════════════ */}
      <nav className="top-nav glass-panel">
        <div className="top-nav-container">

          {/* Brand */}
          <Link to={user ? '/marketplace' : '/'} className="nav-brand">
            <img src="/logo.png" alt="LCU Logo" width="36" height="36" className="nav-logo-img"
              style={{ borderRadius:'50%', border:'2px solid rgba(59,130,246,0.45)', boxShadow:'0 0 12px rgba(59,130,246,0.2)' }}
              fetchpriority="high" decoding="async" loading="eager"
            />
            <div className="nav-brand-text">
              <span className="nav-brand-title">Lead City</span>
              <span className="nav-brand-sub">MARKETPLACE</span>
            </div>
          </Link>

          {/* ── Right controls ── */}
          <div className="nav-right">

            {/* Theme toggle — desktop only */}
            <button onClick={toggleTheme} className="nav-icon-btn nav-desktop-only" aria-label="Toggle theme" title={theme === 'light' ? 'Dark mode' : 'Light mode'}>
              {theme === 'light' ? '🌙' : '☀️'}
            </button>

            {/* Desktop nav links */}
            {user ? (
              <div className="nav-desktop-links">
                <Link to="/marketplace" className={`nav-link${isActive('/marketplace') ? ' active' : ''}`}>Marketplace</Link>
                <Link to="/profile" className={`nav-link${isActive('/profile') ? ' active' : ''}`}>Dashboard</Link>
                <Link to="/post" className="btn-primary nav-post-btn">+ Post Item</Link>
              </div>
            ) : (
              <div className="nav-desktop-links">
                <Link to="/marketplace" className={`nav-link${isActive('/marketplace') ? ' active' : ''}`}>Browse</Link>
                <Link to="/auth" className="btn-primary nav-post-btn">Login / Sign Up</Link>
              </div>
            )}

            {/* Notification bell + Avatar — only for logged-in users */}
            {user && (
              <>
                <div ref={notifRef} style={{ position: 'relative' }}>
                  <button className="nav-icon-btn notif-bell-btn" onClick={handleNotifOpen} aria-label="Notifications">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                  </button>

                  {notifOpen && (
                    <div className="notif-panel">
                      <div className="notif-panel-header">
                        <span className="notif-panel-title">🔔 Notifications</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {notifications.length > 0 && (
                            <button className="notif-clear-btn" onClick={clearNotifications}>Clear all</button>
                          )}
                          <button onClick={() => setNotifOpen(false)} style={{ background:'none',border:'none',color:'var(--text-muted)',fontSize:'1.1rem',cursor:'pointer' }} aria-label="Close">✕</button>
                        </div>
                      </div>
                      <div className="notif-list">
                        {notifications.length === 0 ? (
                          <div className="notif-empty">🎉 You're all caught up!</div>
                        ) : (
                          notifications.map(n => (
                            <div key={n.id} className="notif-item">
                              <span className={`notif-dot notif-dot-${n.type}`} />
                              <div style={{ flex: 1 }}>
                                <div className="notif-item-msg">{n.message}</div>
                                <div className="notif-item-time">{n.time ? new Date(n.time).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : ''}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Avatar / profile dropdown */}
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                  <button
                    className="nav-avatar"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    aria-haspopup="true"
                    aria-expanded={dropdownOpen}
                  >
                    {user.name.charAt(0).toUpperCase()}
                    {user.isVerifiedStudent && <span className="nav-avatar-badge" title="LCU Verified">✓</span>}
                  </button>
                  {dropdownOpen && (
                    <div className="nav-profile-dropdown">
                      <div className="nav-dropdown-header">Hi, {user.name.split(' ')[0]} 👋</div>
                      <button onClick={() => { setDropdownOpen(false); navigate('/profile'); }} className="nav-profile-dropdown-item">👤 My Dashboard</button>
                      <button onClick={() => { setDropdownOpen(false); setModalOpen(true); }} className="nav-profile-dropdown-item">✏️ Edit Profile</button>
                      <button onClick={() => { setDropdownOpen(false); navigate('/post'); }} className="nav-profile-dropdown-item">📦 Post Item</button>
                      <div className="nav-profile-dropdown-divider" />
                      <button onClick={handleLogout} className="nav-profile-dropdown-item" style={{ color: 'var(--error)' }}>🚪 Logout</button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Login btn when not logged in — mobile */}
            {!user && (
              <Link to="/auth" className="btn-primary nav-mobile-login">Login</Link>
            )}
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════
          BOTTOM TAB BAR (mobile only, logged-in users)
          ═══════════════════════════════════════════════════════ */}
      {user && !user.isAdmin && (
        <nav className="bottom-tab-bar" aria-label="Main navigation">
          {/* 1. Market */}
          <Link to="/marketplace" className={`btab-item${isActive('/marketplace') ? ' btab-active' : ''}`}>
            <span className="btab-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
            </span>
            <span className="btab-label">Market</span>
            {isActive('/marketplace') && <span className="btab-dot" />}
          </Link>

          {/* 2. Alerts */}
          <button
            onClick={handleNotifOpen}
            className={`btab-item${notifOpen ? ' btab-active' : ''}`}
            aria-label="Notifications"
          >
            <span className="btab-icon" style={{ position: 'relative' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && <span className="btab-notif-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </span>
            <span className="btab-label">Alerts</span>
          </button>

          {/* 3. Center FAB */}
          <Link to="/post" className="btab-fab" aria-label="Post Item">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </Link>

          {/* 4. Dashboard */}
          <Link to="/profile" className={`btab-item${isActive('/profile') ? ' btab-active' : ''}`} aria-label="Dashboard">
            <span className="btab-icon btab-avatar">
              {user.name.charAt(0).toUpperCase()}
              {user.isVerifiedStudent && <span className="btab-verified-dot" />}
            </span>
            <span className="btab-label">Dashboard</span>
            {isActive('/profile') && <span className="btab-dot" />}
          </Link>
        </nav>
      )}

      <EditProfileModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
