import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = React.useState(false);
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

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/auth');
  };

  return (
    <nav style={styles.nav} className="glass-panel">
      <div style={styles.navContainer} className="container nav-container">
        <Link to="/" style={styles.brand} onClick={() => setMenuOpen(false)}>
          {/* Official LCU logo image */}
          <img src="/logo.png" alt="LCU Logo" style={styles.logoImage} />
          <div style={styles.brandText}>
            <span style={styles.brandTitle}>Lead City</span>
            <span style={styles.brandSub}>MARKETPLACE</span>
          </div>
        </Link>

        {/* Hamburger Menu Icon */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="hamburger">
          {menuOpen ? '✕' : '☰'}
        </button>

        <div className={`nav-links ${menuOpen ? 'open' : ''}`} style={styles.links}>
          <button onClick={toggleTheme} style={styles.themeToggle} className="btn-secondary" aria-label="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          
          {user ? (
            <>
              <Link to="/" style={styles.link} onClick={() => setMenuOpen(false)}>Marketplace</Link>
              <Link to="/chat" style={styles.link} className="chat-link-btn" onClick={() => setMenuOpen(false)}>
                Messages
              </Link>
              {user.isAdmin && (
                <Link to="/admin" style={{ ...styles.link, color: 'var(--gold)', fontWeight: 'bold' }} onClick={() => setMenuOpen(false)}>
                  Admin Panel
                </Link>
              )}
              <Link to="/profile" style={styles.link} onClick={() => setMenuOpen(false)}>
                Dashboard
                {user.wishlist && user.wishlist.length > 0 && (
                  <span style={styles.wishlistBadgeNav}>{user.wishlist.length}</span>
                )}
              </Link>
              
              <Link to="/post" className="btn-primary" style={styles.postBtn} onClick={() => setMenuOpen(false)}>
                + Post Product
              </Link>
              
              <div style={styles.userContainer} className="nav-user-container">
                <div style={styles.avatar}>
                  {user.name.charAt(0).toUpperCase()}
                  {user.isVerifiedStudent && <span style={styles.badgeMini} title="Verified Student">✓</span>}
                </div>
                <button onClick={handleLogout} className="btn-secondary" style={styles.logoutBtn}>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <Link to="/auth" className="btn-primary" onClick={() => setMenuOpen(false)}>Login / Sign Up</Link>
          )}
        </div>
      </div>
    </nav>
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
    color: 'var(--text-gray)',
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
  }
};
