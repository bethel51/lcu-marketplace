import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function AdminLogin() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already an admin, redirect straight to /admin
  useEffect(() => {
    if (user && user.isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      if (loggedUser && loggedUser.isAdmin) {
        showToast('Welcome back, Administrator!', 'success');
        navigate('/admin', { replace: true });
      } else {
        setError('Access denied: You are not authorized as an administrator.');
        showToast('Access denied: Admins only.', 'error');
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials or connection issue.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupAdmin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/setup-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Admin credentials created/reset successfully!', 'success');
        setEmail('beatsnitro101@gmail.com');
        setPassword('password');
      } else {
        setError(data.message || 'Failed to setup admin account.');
      }
    } catch (err) {
      setError('Connection failed. Verify your server connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container} className="container">
      <div style={styles.card} className="glass-panel">
        <header style={styles.header}>
          <div style={styles.badge}>🛡️ SYSTEM PORTAL</div>
          <h2 style={styles.title}>Admin Portal Sign In</h2>
          <p style={styles.subtitle}>Enter credentials to access the management panel</p>
        </header>

        {error && (
          <div style={styles.errorAlert}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Admin Email</label>
            <input
              type="email"
              placeholder="e.g. admin@lcu.edu.ng"
              className="glass-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="glass-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={styles.submitBtn}
          >
            {loading ? 'Authenticating System...' : 'Access Admin Dashboard →'}
          </button>
        </form>

        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={handleSetupAdmin}
            disabled={loading}
            className="btn-secondary"
            style={{ width: '100%', borderStyle: 'dashed', borderColor: 'var(--gold)' }}
          >
            ⚙️ One-Click Setup/Reset Admin Credentials
          </button>
        </div>

        <div style={styles.footerLink}>
          <Link to="/" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            ← Return to LCU Marketplace Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '75vh',
    padding: '20px 0',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    padding: '36px',
    border: '1px solid var(--border-strong)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '700',
    letterSpacing: '0.05em',
    marginBottom: '10px',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: '800',
    color: '#fff',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-gray)',
    marginTop: '6px',
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#fca5a5',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    marginBottom: '20px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.82rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  submitBtn: {
    marginTop: '8px',
    width: '100%',
  },
  footerLink: {
    textAlign: 'center',
    marginTop: '24px',
  }
};
