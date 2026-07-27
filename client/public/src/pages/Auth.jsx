import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

// ── View states ────────────────────────────────────────────────
// 'login'           → Sign-in form
// 'register'        → Create-account form
// 'verifyOtp'       → Email OTP after register / unverified login
// 'forgotRequest'   → Enter email to request reset code
// 'forgotVerify'    → Enter OTP + new password
// 'forgotSuccess'   → Confirmation screen

export default function Auth() {
  const [view, setView] = useState('login');

  // ── Shared fields ──────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ── Registration-only fields ────────────────────────────────
  const [name, setName] = useState('');
  const [hostel, setHostel] = useState('Off-Campus');
  const [faculty, setFaculty] = useState('Information Technology & Applied Sciences');
  const [department, setDepartment] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [requestVerification, setRequestVerification] = useState(true);

  // ── OTP (email verify) ────────────────────────────────────
  const [otpCode, setOtpCode] = useState('');

  // ── Forgot password ───────────────────────────────────────
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // ── Feedback ──────────────────────────────────────────────
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { login, register, verifyOtp, resendOtp, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/profile';

  const clearFeedback = () => { setError(''); setSuccessMsg(''); };

  // ── Submit handler (login / register / verifyOtp) ──────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearFeedback();
    try {
      if (view === 'verifyOtp') {
        await verifyOtp(email, otpCode);
        navigate(from, { replace: true });
      } else if (view === 'login') {
        try {
          await login(email, password);
          navigate(from, { replace: true });
        } catch (loginErr) {
          if (loginErr.message.includes('verify your email') || loginErr.message.includes('verification')) {
            setView('verifyOtp');
            setError(loginErr.message);
          } else {
            throw loginErr;
          }
        }
      } else {
        // register
        const matricPattern = /^lcu\/ug\/\d{2}\/\d{5}$/i;
        if (!matricPattern.test(matricNumber)) {
          setError('Matric number must be in the format: LCU/UG/00/00000');
          return;
        }
        if (!phoneNumber.match(/^[0-9]{11}$/)) {
          setError('Phone number must be 11 digits (e.g. 08012345678)');
          return;
        }
        const res = await register(name, email, password, hostel, faculty, department, matricNumber, phoneNumber, requestVerification);
        setSuccessMsg(res.message || 'OTP verification code has been sent to your email.');
        setView('verifyOtp');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your details.');
    }
  };

  const handleResendOtp = async () => {
    clearFeedback();
    try {
      const res = await resendOtp(email);
      setSuccessMsg(res.message || 'Verification code resent successfully!');
    } catch (err) {
      setError(err.message || 'Failed to resend verification code.');
    }
  };

  // ── Forgot password: Step 1 — request OTP ─────────────────
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    clearFeedback();
    setResetLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');
      setSuccessMsg(data.message);
      setView('forgotVerify');
    } catch (err) {
      setError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  // ── Forgot password: Step 2 — verify OTP + new password ───
  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearFeedback();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp: resetOtp, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Reset failed');
      setView('forgotSuccess');
    } catch (err) {
      setError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  // ── Static data ────────────────────────────────────────────
  const hostelsList = ['Bronze Hostel','Silver Hostel','Gold Hostel','Platinum Hostel','Jasper Hall','Emerald Hall','Pearl Hall','Sapphire Hall','Off-Campus'];
  const facultiesList = ['Information Technology & Applied Sciences','Basic Medical & Health Sciences','Social & Management Sciences','Arts, Education & Humanities','Law'];
  const departmentsByFaculty = {
    'Information Technology & Applied Sciences': ['Computer Science','Information Technology','Cyber Security','Software Engineering','Biochemistry','Industrial Chemistry','Microbiology','Physics with Electronics'],
    'Basic Medical & Health Sciences': ['Medicine & Surgery','Nursing Science','Medical Laboratory Science','Pharmacology','Physiotherapy','Public Health'],
    'Social & Management Sciences': ['Accounting','Banking & Finance','Business Administration','Economics','Mass Communication','Political Science','Sociology'],
    'Arts, Education & Humanities': ['English Language','History & International Studies','Philosophy','Education & English','Education & Mathematics'],
    'Law': ['Law'],
  };
  const currentDepts = departmentsByFaculty[faculty] || [];

  // ── Title / subtitle per view ──────────────────────────────
  const titles = {
    login: 'Sign In',
    register: 'Create Student Account',
    verifyOtp: 'Verify Your Email',
    forgotRequest: 'Forgot Password',
    forgotVerify: 'Enter Reset Code',
    forgotSuccess: 'Password Reset!',
  };
  const subtitles = {
    login: 'Access the exclusive Lead City University marketplace',
    register: 'Join LCU student hub to buy, sell, and offer student services',
    verifyOtp: `Enter the 6-digit OTP sent to ${email}`,
    forgotRequest: 'Enter your registered student email to receive a reset code',
    forgotVerify: `Enter the code sent to ${forgotEmail} and choose a new password`,
    forgotSuccess: 'Your password has been updated. You can now sign in.',
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.card} className="glass-panel auth-card">

        {/* ── Back to Homepage ──────────────────────────────── */}
        <Link to="/" style={styles.backHome}>
          ← Back to Homepage
        </Link>

        {/* ── Header ───────────────────────────────────────── */}
        <div style={styles.header}>
          <h2 style={styles.title}>{titles[view]}</h2>
          <p style={styles.subtitle}>{subtitles[view]}</p>
        </div>

        {/* ── Feedback banners ──────────────────────────────── */}
        {error      && <div style={styles.errorBanner}>{error}</div>}
        {successMsg && <div style={styles.successBanner}>{successMsg}</div>}

        {/* ══════════════════════════════════════════════════
            VIEW: verifyOtp
        ══════════════════════════════════════════════════ */}
        {view === 'verifyOtp' && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>6-Digit OTP Code</label>
              <input
                type="text" required maxLength="6" placeholder="123456"
                value={otpCode} onChange={e => setOtpCode(e.target.value)}
                className="glass-input"
                style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.4rem' }}
              />
              <button type="button" onClick={handleResendOtp} style={styles.linkBtn}>
                Didn't receive a code? Resend OTP
              </button>
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={styles.submitBtn}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <div style={styles.footer}>
              <button type="button" onClick={() => { setView('login'); clearFeedback(); }} style={styles.linkBtn}>
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* ══════════════════════════════════════════════════
            VIEW: login
        ══════════════════════════════════════════════════ */}
        {view === 'login' && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Student Email Address</label>
              <input type="email" required placeholder="e.g. yourname@lcu.edu.ng"
                value={email} onChange={e => setEmail(e.target.value)} className="glass-input" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input type="password" required placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} className="glass-input" />
            </div>
            {/* Forgot password link */}
            <div style={{ textAlign: 'right', marginTop: '-8px' }}>
              <button type="button" onClick={() => { setForgotEmail(email); setView('forgotRequest'); clearFeedback(); }} style={styles.linkBtn}>
                Forgot Password?
              </button>
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={styles.submitBtn}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <div style={styles.footer}>
              <span>Don't have an account?</span>
              <button type="button" onClick={() => { setView('register'); clearFeedback(); }} style={styles.linkBtn}>
                Sign Up here
              </button>
            </div>
          </form>
        )}

        {/* ══════════════════════════════════════════════════
            VIEW: register
        ══════════════════════════════════════════════════ */}
        {view === 'register' && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Full Name</label>
              <input type="text" required placeholder="e.g. John Doe"
                value={name} onChange={e => setName(e.target.value)} className="glass-input" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Student Email Address</label>
              <input type="email" required placeholder="e.g. yourname@lcu.edu.ng"
                value={email} onChange={e => setEmail(e.target.value)} className="glass-input" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input type="password" required placeholder="At least 6 characters"
                value={password} onChange={e => setPassword(e.target.value)} className="glass-input" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Hostel / Location</label>
              <select value={hostel} onChange={e => setHostel(e.target.value)} className="glass-input">
                {hostelsList.map(h => <option key={h} value={h} style={styles.option}>{h}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Faculty</label>
              <select value={faculty} onChange={e => { setFaculty(e.target.value); setDepartment(''); }} className="glass-input">
                {facultiesList.map(f => <option key={f} value={f} style={styles.option}>{f}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Department</label>
              <select value={department} required onChange={e => setDepartment(e.target.value)} className="glass-input">
                <option value="" disabled style={styles.option}>-- Select Department --</option>
                {currentDepts.map(d => <option key={d} value={d} style={styles.option}>{d}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Matric Number</label>
              <input type="text" required placeholder="e.g. LCU/UG/22/12345"
                value={matricNumber} onChange={e => setMatricNumber(e.target.value.toUpperCase())} className="glass-input" />
              <span style={styles.hint}>Format: LCU/UG/YY/NNNNN</span>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Phone Number</label>
              <input type="tel" required maxLength="11" placeholder="e.g. 08012345678"
                value={phoneNumber} onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))} className="glass-input" />
            </div>
            <div style={styles.checkboxContainer}>
              <input type="checkbox" id="verify" checked={requestVerification}
                onChange={e => setRequestVerification(e.target.checked)} style={styles.checkbox} />
              <label htmlFor="verify" style={styles.checkboxLabel}>Request LCU student verification badge</label>
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={styles.submitBtn}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
            <div style={styles.footer}>
              <span>Already registered?</span>
              <button type="button" onClick={() => { setView('login'); clearFeedback(); }} style={styles.linkBtn}>
                Login here
              </button>
            </div>
          </form>
        )}

        {/* ══════════════════════════════════════════════════
            VIEW: forgotRequest
        ══════════════════════════════════════════════════ */}
        {view === 'forgotRequest' && (
          <form onSubmit={handleForgotRequest} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Registered Student Email</label>
              <input type="email" required placeholder="e.g. yourname@lcu.edu.ng"
                value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="glass-input" />
            </div>
            <button type="submit" disabled={resetLoading} className="btn-primary" style={styles.submitBtn}>
              {resetLoading ? 'Sending Code...' : 'Send Reset Code'}
            </button>
            <div style={styles.footer}>
              <button type="button" onClick={() => { setView('login'); clearFeedback(); }} style={styles.linkBtn}>
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* ══════════════════════════════════════════════════
            VIEW: forgotVerify
        ══════════════════════════════════════════════════ */}
        {view === 'forgotVerify' && (
          <form onSubmit={handleResetPassword} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Reset Code (6-digit OTP)</label>
              <input type="text" required maxLength="6" placeholder="123456"
                value={resetOtp} onChange={e => setResetOtp(e.target.value)}
                className="glass-input"
                style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.4rem' }} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>New Password</label>
              <input type="password" required placeholder="At least 6 characters"
                value={newPassword} onChange={e => setNewPassword(e.target.value)} className="glass-input" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Confirm New Password</label>
              <input type="password" required placeholder="Repeat your new password"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="glass-input" />
            </div>
            <button type="submit" disabled={resetLoading} className="btn-primary" style={styles.submitBtn}>
              {resetLoading ? 'Resetting...' : 'Reset Password'}
            </button>
            <div style={styles.footer}>
              <button type="button" onClick={() => { setView('forgotRequest'); clearFeedback(); }} style={styles.linkBtn}>
                ← Resend Code
              </button>
            </div>
          </form>
        )}

        {/* ══════════════════════════════════════════════════
            VIEW: forgotSuccess
        ══════════════════════════════════════════════════ */}
        {view === 'forgotSuccess' && (
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒✅</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
              Your password has been successfully reset.<br />You can now sign in with your new password.
            </p>
            <button className="btn-primary" style={{ width: '100%' }}
              onClick={() => { setView('login'); clearFeedback(); setEmail(forgotEmail); }}>
              Go to Sign In
            </button>
          </div>
        )}

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
    maxWidth: '540px',
    padding: '36px 40px',
    border: '1px solid var(--border-color)',
    position: 'relative',
  },
  backHome: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.82rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    marginBottom: '20px',
    transition: 'color 0.2s',
    textDecoration: 'none',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  title: {
    fontSize: '1.9rem',
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.88rem',
    lineHeight: '1.4',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    color: 'var(--error)',
    border: '1px solid rgba(239,68,68,0.35)',
    borderRadius: '8px',
    padding: '11px 14px',
    marginBottom: '20px',
    fontSize: '0.85rem',
    textAlign: 'center',
  },
  successBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    color: 'var(--success)',
    border: '1px solid rgba(16,185,129,0.35)',
    borderRadius: '8px',
    padding: '11px 14px',
    marginBottom: '20px',
    fontSize: '0.85rem',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
  },
  label: {
    fontSize: '0.83rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  hint: {
    fontSize: '0.73rem',
    color: 'var(--text-muted)',
  },
  option: {
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    marginTop: '2px',
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
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    lineHeight: '1.45',
    flex: 1,
  },
  submitBtn: {
    width: '100%',
    marginTop: '4px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '4px',
    fontSize: '0.88rem',
    color: 'var(--text-secondary)',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--gold)',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '0',
    fontSize: '0.88rem',
  },
};
