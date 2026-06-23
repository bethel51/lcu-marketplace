import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config';

export default function AdminLogin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in as admin, redirect to dashboard
  useEffect(() => {
    if (user && user.isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (pin.length < 4) {
      setError('PIN must be at least 4 digits.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/verify-admin-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      
      if (res.ok) {
        // Log user in using localstorage credentials token exchange
        localStorage.setItem('lcu_user', JSON.stringify(data));
        localStorage.setItem('lcu_token', data.token);
        
        // Reload state inside AuthContext implicitly or trigger a page refresh
        showToast('System authorized. Access granted! 🛡️', 'success');
        
        // Let react-router state pick up the login and update the view
        window.location.href = '/admin';
      } else {
        setError(data.message || 'Verification failed. Incorrect PIN.');
        showToast('Invalid PIN access code.', 'error');
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
          <div style={styles.badge}>🛡️ SYSTEM SECURITY</div>
          <h2 style={styles.title}>Admin Access PIN</h2>
          <p style={styles.subtitle}>Enter the 6-digit administration authorization PIN code</p>
        </header>

        {error && (
          <div style={styles.errorAlert}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handlePinSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Administration PIN Code</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter Access PIN"
              className="glass-input"
              style={{ letterSpacing: '0.4em', textAlign: 'center', fontSize: '1.4rem' }}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={styles.submitBtn}
          >
            {loading ? 'Verifying system PIN...' : 'Verify Access PIN →'}
          </button>
        </form>

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
    maxWidth: '400px',
    padding: '36px',
    border: '1px solid var(--border-strong)',
    textAlign: 'center',
  },
  header: {
    marginBottom: '28px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: 'var(--gold)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
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
    lineHeight: '1.4',
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
    justifyContent: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.82rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  submitBtn: {
    width: '100%',
  },
  footerLink: {
    marginTop: '28px',
  }
};
