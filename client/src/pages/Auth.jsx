import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [hostel, setHostel] = useState('Off-Campus');
  const [faculty, setFaculty] = useState('Basic Medical Sciences');
  const [requestVerification, setRequestVerification] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const { login, register, verifyOtp, resendOtp, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/profile';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    try {
      if (isVerifyingOtp) {
        await verifyOtp(email, otpCode);
        navigate(from, { replace: true });
      } else if (isLogin) {
        try {
          await login(email, password);
          navigate(from, { replace: true });
        } catch (loginErr) {
          // If unverified, switch to verification screen
          if (loginErr.message.includes('verify your email') || loginErr.message.includes('verification')) {
            setIsVerifyingOtp(true);
            setError(loginErr.message);
          } else {
            throw loginErr;
          }
        }
      } else {
        const res = await register(name, email, password, hostel, faculty, requestVerification);
        setSuccessMsg(res.message || 'OTP verification code has been sent to your email.');
        setIsVerifyingOtp(true);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check details.');
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setSuccessMsg('');
    try {
      const res = await resendOtp(email);
      setSuccessMsg(res.message || 'Verification code resent successfully!');
    } catch (err) {
      setError(err.message || 'Failed to resend verification code.');
    }
  };

  const hostelsList = [
    'Bronze Hostel',
    'Silver Hostel',
    'Gold Hostel',
    'Platinum Hostel',
    'Jasper Hall',
    'Emerald Hall',
    'Pearl Hall',
    'Sapphire Hall',
    'Off-Campus'
  ];

  const facultiesList = [
    'Information Technology & Applied Sciences',
    'Basic Medical & Health Sciences',
    'Social & Management Sciences',
    'Arts, Education & Humanities',
    'Law'
  ];

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.card} className="glass-panel">
        <div style={styles.header}>
          <h2 style={styles.title}>
            {isVerifyingOtp 
              ? 'Verify Your Email' 
              : isLogin ? 'Sign In' : 'Create Student Account'}
          </h2>
          <p style={styles.subtitle}>
            {isVerifyingOtp 
              ? `Enter the 6-digit OTP code sent to ${email}`
              : isLogin 
                ? 'Access the exclusive Lead City University marketplace' 
                : 'Join LCU student hub to buy, sell, and offer student services'}
          </p>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {successMsg && <div style={{ ...styles.error, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', borderColor: 'var(--success)' }}>{successMsg}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {isVerifyingOtp ? (
            <div style={styles.field}>
              <label style={styles.label}>6-Digit OTP Code</label>
              <input
                type="text"
                required
                maxLength="6"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="glass-input"
                style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.4rem' }}
              />
              <button 
                type="button" 
                onClick={handleResendOtp} 
                style={{ ...styles.toggleBtn, marginTop: '8px', fontSize: '0.85rem' }}
              >
                Didn't receive a code? Resend OTP
              </button>
            </div>
          ) : (
            <>
              {!isLogin && (
                <div style={styles.field}>
                  <label style={styles.label}>Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="glass-input"
                  />
                </div>
              )}

              <div style={styles.field}>
                <label style={styles.label}>Student Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. yourname@lcu.edu.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input"
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input"
                />
              </div>

              {!isLogin && (
                <>
                  <div style={styles.field}>
                    <label style={styles.label}>Hostel / Location</label>
                    <select
                      value={hostel}
                      onChange={(e) => setHostel(e.target.value)}
                      className="glass-input"
                      style={styles.select}
                    >
                      {hostelsList.map(h => (
                        <option key={h} value={h} style={styles.option}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Faculty</label>
                    <select
                      value={faculty}
                      onChange={(e) => setFaculty(e.target.value)}
                      className="glass-input"
                      style={styles.select}
                    >
                      {facultiesList.map(f => (
                        <option key={f} value={f} style={styles.option}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.checkboxContainer}>
                    <input
                      type="checkbox"
                      id="verify"
                      checked={requestVerification}
                      onChange={(e) => setRequestVerification(e.target.checked)}
                      style={styles.checkbox}
                    />
                    <label htmlFor="verify" style={styles.checkboxLabel}>
                      Request LCU student verification badge (Auto-Verified for demo)
                    </label>
                  </div>
                </>
              )}
            </>
          )}

          <button type="submit" disabled={loading} className="btn-primary" style={styles.submitBtn}>
            {loading ? 'Processing...' : isVerifyingOtp ? 'Verify OTP' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div style={styles.footer}>
          {isVerifyingOtp ? (
            <button onClick={() => setIsVerifyingOtp(false)} style={styles.toggleBtn}>
              ← Back to login / signup
            </button>
          ) : (
            <>
              <span>
                {isLogin ? "Don't have an account?" : 'Already registered?'}
              </span>
              <button onClick={() => setIsLogin(!isLogin)} style={styles.toggleBtn}>
                {isLogin ? 'Sign Up here' : 'Login here'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: 'calc(100vh - 120px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    padding: '40px',
    border: '1px solid var(--border-color)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '2rem',
    color: '#fff',
    marginBottom: '8px',
  },
  subtitle: {
    color: 'var(--text-gray)',
    fontSize: '0.9rem',
    lineHeight: '1.4',
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: 'var(--error)',
    border: '1px solid var(--error)',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '24px',
    fontSize: '0.85rem',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  fieldHalf: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-gray)',
  },
  select: {
    cursor: 'pointer',
  },
  option: {
    background: 'var(--bg-input)',
    color: 'var(--text-white)',
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    marginTop: '6px',
  },
  checkbox: {
    accentColor: 'var(--gold)',
    width: '16px',
    height: '16px',
    marginTop: '2px',
    flexShrink: 0,
  },
  checkboxLabel: {
    fontSize: '0.82rem',
    color: 'var(--text-gray)',
    cursor: 'pointer',
    lineHeight: '1.45',
    flex: 1,
  },
  submitBtn: {
    width: '100%',
    marginTop: '8px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '32px',
    fontSize: '0.9rem',
    color: 'var(--text-gray)',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--gold)',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '0',
    fontSize: '0.9rem',
  }
};
