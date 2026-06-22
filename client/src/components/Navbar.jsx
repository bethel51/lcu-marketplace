import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

function EditProfileModal({ isOpen, onClose }) {
  const { user, token, updateProfile, fetchProfile } = useAuth();
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
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="glass-input"
              />
            </div>

            <div className="profile-modal-field">
              <label className="profile-modal-label">Phone Number</label>
              <input
                type="tel"
                maxLength="11"
                placeholder="e.g. 08012345678"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                className="glass-input"
              />
            </div>

            <div className="profile-modal-field">
              <label className="profile-modal-label">Hostel / Location</label>
              <select value={hostel} onChange={e => setHostel(e.target.value)} className="glass-input">
                {HOSTELS.map(h => <option key={h} value={h} style={{ background:'var(--bg-input)', color: 'var(--text-primary)' }}>{h}</option>)}
              </select>
            </div>

            <div className="profile-modal-field">
              <label className="profile-modal-label">Faculty</label>
              <select value={faculty} onChange={e => { setFaculty(e.target.value); setDepartment(''); }} className="glass-input">
                {FACULTIES.map(f => <option key={f} value={f} style={{ background:'var(--bg-input)', color: 'var(--text-primary)' }}>{f}</option>)}
              </select>
            </div>

            <div className="profile-modal-field">
              <label className="profile-modal-label">Department</label>
              <select value={department} onChange={e => setDepartment(e.target.value)} className="glass-input">
                <option value="" style={{ background:'var(--bg-input)', color: 'var(--text-primary)' }}>— Select —</option>
                {departments.map(d => <option key={d} value={d} style={{ background:'var(--bg-input)', color: 'var(--text-primary)' }}>{d}</option>)}
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

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);
  const [theme, setTheme] = React.useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  React.useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Close menu on route change
  React.useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Click outside to close dropdown
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    setMenuOpen(false);
    setDropdownOpen(false);
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Overlay for mobile drawer */}
      {menuOpen && (
        <div
          className="nav-overlay"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <nav style={styles.nav} className="glass-panel">
        <div style={styles.navContainer} className="container nav-container">

          {/* ─── Brand ───────────────────────────────────────── */}
          <Link to="/" style={styles.brand} onClick={() => setMenuOpen(false)}>
            <img src="/logo.png" alt="LCU Logo" style={styles.logoImage} />
            <div style={styles.brandText}>
              <span style={styles.brandTitle}>Lead City</span>
              <span style={styles.brandSub}>MARKETPLACE</span>
            </div>
          </Link>

          {/* ─── Hamburger ───────────────────────────────────── */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="hamburger"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? '✕' : '☰'}
          </button>

          {/* ─── Nav Links ───────────────────────────────────── */}
          <div className={`nav-links ${menuOpen ? 'open' : ''}`} style={styles.links}>

            <button
              onClick={toggleTheme}
              style={styles.themeToggle}
              className="btn-secondary"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>

            {user ? (
              <>
                <Link
                  to="/marketplace"
                  style={{ ...styles.link, color: isActive('/marketplace') ? 'var(--gold)' : 'var(--text-gray)' }}
                >
                  Marketplace
                </Link>
                <Link
                  to="/chat"
                  style={{ ...styles.link, color: isActive('/chat') ? 'var(--gold)' : 'var(--text-gray)' }}
                  className="chat-link-btn"
                >
                  Messages
                </Link>
                {user.isAdmin && (
                  <Link
                    to="/admin"
                    style={{ ...styles.link, color: 'var(--gold)', fontWeight: 'bold' }}
                  >
                    Admin Panel
                  </Link>
                )}
                <Link
                  to="/profile"
                  style={{ ...styles.link, color: isActive('/profile') ? 'var(--gold)' : 'var(--text-gray)' }}
                >
                  Dashboard
                  {user.wishlist && user.wishlist.length > 0 && (
                    <span style={styles.wishlistBadgeNav}>{user.wishlist.length}</span>
                  )}
                </Link>

                <Link to="/post" className="btn-primary" style={styles.postBtn}>
                  + Post Item
                </Link>

                <div style={{ ...styles.userContainer, position: 'relative' }} className="nav-user-container" ref={dropdownRef}>
                  <div 
                    style={{ ...styles.avatar, cursor: 'pointer' }}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    role="button"
                    aria-haspopup="true"
                    aria-expanded={dropdownOpen}
                  >
                    {user.name.charAt(0).toUpperCase()}
                    {user.isVerifiedStudent && (
                      <span style={styles.badgeMini} title="LCU Verified Student">✓</span>
                    )}
                  </div>
                  {dropdownOpen && (
                    <div className="nav-profile-dropdown">
                      <div style={{ padding: '10px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold' }}>
                        Hi, {user.name.split(' ')[0]}
                      </div>
                      <button 
                        onClick={() => { setDropdownOpen(false); navigate('/profile'); }}
                        className="nav-profile-dropdown-item"
                      >
                        👤 My Dashboard
                      </button>
                      <button 
                        onClick={() => { setDropdownOpen(false); setModalOpen(true); }}
                        className="nav-profile-dropdown-item"
                      >
                        ✏️ Edit Profile
                      </button>
                      <button 
                        onClick={() => { setDropdownOpen(false); navigate('/post'); }}
                        className="nav-profile-dropdown-item"
                      >
                        📦 Post Item
                      </button>
                      <div className="nav-profile-dropdown-divider" />
                      <button onClick={handleLogout} className="nav-profile-dropdown-item" style={{ color: 'var(--error)' }}>
                        🚪 Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/marketplace"
                  style={{ ...styles.link, color: isActive('/marketplace') ? 'var(--gold)' : 'var(--text-gray)' }}
                >
                  Browse
                </Link>
                <Link to="/auth" className="btn-primary" style={styles.postBtn}>
                  Login / Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
      <EditProfileModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

const styles = {
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    borderRadius: 0,
    borderWidth: '0 0 1px 0',
    backgroundColor: 'var(--bg-nav)',
  },
  navContainer: {
    height: '70px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  logoImage: {
    width: '40px',
    height: '40px',
    objectFit: 'contain',
    borderRadius: '50%',
    border: '2px solid var(--secondary-blue)',
  },
  brandText: {
    display: 'flex',
    flexDirection: 'column',
  },
  brandTitle: {
    fontFamily: 'var(--font-title)',
    fontWeight: '800',
    fontSize: '1.3rem',
    color: 'var(--text-white)',
    letterSpacing: '-0.02em',
  },
  brandSub: {
    fontSize: '0.65rem',
    letterSpacing: '0.2em',
    color: 'var(--gold)',
    fontWeight: '700',
    marginTop: '-4px',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  themeToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    padding: 0,
    cursor: 'pointer',
    fontSize: '1.2rem',
    border: '1px solid var(--border-color)',
    background: 'rgba(255, 255, 255, 0.05)',
    transition: 'var(--transition-smooth)',
  },
  link: {
    fontWeight: '500',
    fontSize: '0.95rem',
    transition: 'var(--transition-smooth)',
    cursor: 'pointer',
  },
  postBtn: {
    padding: '8px 16px',
    fontSize: '0.9rem',
    textDecoration: 'none',
  },
  userContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderLeft: '1px solid var(--border-color)',
    paddingLeft: '20px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-blue)',
    border: '2px solid var(--gold)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '0.95rem',
    color: 'var(--gold)',
    position: 'relative',
  },
  badgeMini: {
    position: 'absolute',
    bottom: '-2px',
    right: '-2px',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    backgroundColor: 'var(--secondary-blue)',
    color: '#fff',
    fontSize: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #fff',
  },
  logoutBtn: {
    padding: '6px 12px',
    fontSize: '0.8rem',
  },
  wishlistBadgeNav: {
    marginLeft: '6px',
    padding: '2px 6px',
    borderRadius: '10px',
    backgroundColor: 'var(--error)',
    color: '#fff',
    fontSize: '0.7rem',
    fontWeight: '700',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
