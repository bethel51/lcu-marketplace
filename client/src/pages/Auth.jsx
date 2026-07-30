import React, { useState, useEffect } from 'react';
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
  const [regStep, setRegStep] = useState(1); // 1: Account basics, 2: Student details

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    if (mode === 'register') {
      setView('register');
      setRegStep(1);
    } else if (mode === 'login') {
      setView('login');
    }
  }, [location.search]);

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

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
  const from = location.state?.from || '/profile';

  const clearFeedback = () => { setError(''); setSuccessMsg(''); };

  // Register Step Validation
  const validateStep1 = () => {
    clearFeedback();
    if (!name.trim()) {
      setError('Please enter your full name.');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid student email.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    return true;
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (validateStep1()) {
      setRegStep(2);
    }
  };

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
    login: 'Welcome Back',
    register: 'Join LCU Hub',
    verifyOtp: 'Verify Your Email',
    forgotRequest: 'Reset Password',
    forgotVerify: 'Enter Reset Code',
    forgotSuccess: 'Password Reset!',
  };
  const subtitles = {
    login: 'Access the exclusive Lead City University marketplace',
    register: 'Create your account to start buying and selling with other students',
    verifyOtp: `Enter the 6-digit OTP sent to ${email}`,
    forgotRequest: 'Enter your registered student email to receive a reset code',
    forgotVerify: `Enter the code sent to ${forgotEmail} and choose a new password`,
    forgotSuccess: 'Your password has been updated. You can now sign in.',
  };

  return (
    <div style={styles.pageWrapper}>
      {/* Dynamic CSS styles injected to handle responsiveness, icons, layout, and transitions */}
      <style>{`
        .auth-container {
          display: flex;
          min-height: calc(100vh - 100px);
          max-width: 1200px;
          width: 100%;
          margin: 40px auto;
          background: rgba(14, 22, 44, 0.45);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: var(--glass-shadow);
          animation: authFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .auth-side-panel {
          flex: 1;
          background: linear-gradient(135deg, rgba(12, 35, 64, 0.95) 0%, rgba(6, 12, 26, 0.98) 100%);
          padding: 50px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          position: relative;
          overflow: hidden;
        }

        .auth-side-panel::before {
          content: '';
          position: absolute;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
          top: -100px;
          left: -100px;
          pointer-events: none;
        }

        .auth-side-panel::after {
          content: '';
          position: absolute;
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, rgba(96, 165, 250, 0.1) 0%, transparent 70%);
          bottom: -50px;
          right: -50px;
          pointer-events: none;
        }

        .auth-main-panel {
          flex: 1.1;
          padding: 50px 60px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
        }

        .auth-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .auth-input-icon {
          position: absolute;
          left: 14px;
          color: var(--text-muted);
          width: 18px;
          height: 18px;
          pointer-events: none;
          transition: var(--transition-smooth);
        }

        .glass-input-with-icon {
          padding-left: 44px !important;
          padding-right: 44px !important;
          transition: var(--transition-smooth) !important;
        }

        .glass-input-with-icon:focus + .auth-input-icon {
          color: var(--text-accent);
          filter: drop-shadow(0 0 4px rgba(96, 165, 250, 0.5));
        }

        .password-toggle-btn {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 4px;
          transition: var(--transition-smooth);
        }

        .password-toggle-btn:hover {
          color: var(--text-primary);
        }

        .feature-item {
          display: flex;
          gap: 16px;
          margin-bottom: 28px;
          align-items: flex-start;
          transition: transform 0.3s ease;
        }

        .feature-item:hover {
          transform: translateX(6px);
        }

        .feature-icon-box {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-accent);
          flex-shrink: 0;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.05);
        }

        .feature-text-title {
          font-family: var(--font-title);
          font-weight: 600;
          font-size: 0.98rem;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .feature-text-desc {
          font-size: 0.84rem;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        .step-indicator-bar {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          justify-content: center;
        }

        .step-dot {
          height: 6px;
          border-radius: 3px;
          transition: all 0.35s ease;
          background: rgba(255, 255, 255, 0.1);
        }

        .step-dot.active {
          background: var(--text-accent);
          box-shadow: 0 0 8px var(--text-accent);
        }

        .back-to-home-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.82rem;
          color: var(--text-muted);
          font-weight: 500;
          text-decoration: none;
          transition: var(--transition-smooth);
        }

        .back-to-home-link:hover {
          color: var(--text-primary);
          transform: translateX(-3px);
        }

        @keyframes authFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 900px) {
          .auth-side-panel {
            display: none;
          }
          .auth-container {
            max-width: 520px;
            margin: 20px auto;
          }
          .auth-main-panel {
            padding: 40px 30px;
          }
        }
      `}</style>

      <div className="auth-container">
        
        {/* ── Left Side Panel (Value Proposition) ──────────────── */}
        <div className="auth-side-panel">
          <div>
            <Link to="/" className="back-to-home-link" style={{ marginBottom: '40px' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Homepage
            </Link>

            <div style={{ marginTop: '20px' }}>
              <span style={{
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '600',
                letterSpacing: '0.05em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '20px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                LCU EXCLUSIVE PLATFORM
              </span>
              <h1 style={{
                fontFamily: 'var(--font-title)',
                fontWeight: '800',
                fontSize: '2.2rem',
                color: 'var(--text-primary)',
                lineHeight: '1.25',
                marginBottom: '20px',
                letterSpacing: '-0.02em'
              }}>
                The smart hub for Lead City students
              </h1>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '0.95rem',
                lineHeight: '1.6',
                marginBottom: '40px'
              }}>
                List items you no longer need, provide professional services on campus, or browse deals verified exclusively by matriculated LCU peers.
              </p>
            </div>

            <div className="features-list">
              <div className="feature-item">
                <div className="feature-icon-box">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div>
                  <h4 className="feature-text-title">Campus Trading</h4>
                  <p className="feature-text-desc">Post products, textbooks, housing goods and find local buyers immediately.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon-box">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <h4 className="feature-text-title">Student Verification</h4>
                  <p className="feature-text-desc">Every account corresponds to a real matriculated student for authentic community safety.</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} Lead City University. All rights reserved.
          </div>
        </div>

        {/* ── Right Side Panel (Interactive Forms) ────────────── */}
        <div className="auth-main-panel">
          
          {/* Mobile Back Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }} className="mobile-only-back">
            <Link to="/" className="back-to-home-link">
              ← Home
            </Link>
          </div>

          {/* ── LCU Logo (STRICTLY UNCHANGED) ─────────────────── */}
          <div style={styles.logoWrap}>
            <img
              src="/logo.png"
              alt="LCU Marketplace Logo"
              style={styles.logoImg}
              fetchpriority="high"
              decoding="async"
            />
            <div style={styles.logoText}>
              <span style={styles.logoTitle}>Lead City</span>
              <span style={styles.logoSub}>MARKETPLACE</span>
            </div>
          </div>

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
                <div className="auth-input-wrapper">
                  <input
                    type="text" required maxLength="6" placeholder="123456"
                    value={otpCode} onChange={e => setOtpCode(e.target.value)}
                    className="glass-input glass-input-with-icon"
                    style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.4rem' }}
                  />
                  <svg className="auth-input-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ left: '20px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
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
                <div className="auth-input-wrapper">
                  <input type="email" required placeholder="e.g. yourname@lcu.edu.ng"
                    value={email} onChange={e => setEmail(e.target.value)} className="glass-input glass-input-with-icon" />
                  <svg className="auth-input-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>Password</label>
                <div className="auth-input-wrapper">
                  <input type={showPassword ? "text" : "password"} required placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} className="glass-input glass-input-with-icon" />
                  <svg className="auth-input-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
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
                <button type="button" onClick={() => { setView('register'); setRegStep(1); clearFeedback(); }} style={styles.linkBtn}>
                  Sign Up here
                </button>
              </div>
            </form>
          )}

          {/* ══════════════════════════════════════════════════
              VIEW: register (With Step 1 and Step 2 Wizard)
          ══════════════════════════════════════════════════ */}
          {view === 'register' && (
            <form onSubmit={handleSubmit} style={styles.form}>
              
              {/* Progress dots */}
              <div className="step-indicator-bar">
                <div className={`step-dot ${regStep >= 1 ? 'active' : ''}`} style={{ width: regStep === 1 ? '24px' : '8px' }}></div>
                <div className={`step-dot ${regStep === 2 ? 'active' : ''}`} style={{ width: regStep === 2 ? '24px' : '8px' }}></div>
              </div>

              {regStep === 1 ? (
                /* ── STEP 1: Basic Info ── */
                <>
                  <div style={styles.field}>
                    <label style={styles.label}>Full Name</label>
                    <div className="auth-input-wrapper">
                      <input type="text" required placeholder="e.g. John Doe"
                        value={name} onChange={e => setName(e.target.value)} className="glass-input glass-input-with-icon" />
                      <svg className="auth-input-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Student Email Address</label>
                    <div className="auth-input-wrapper">
                      <input type="email" required placeholder="e.g. yourname@lcu.edu.ng"
                        value={email} onChange={e => setEmail(e.target.value)} className="glass-input glass-input-with-icon" />
                      <svg className="auth-input-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Password</label>
                    <div className="auth-input-wrapper">
                      <input type={showPassword ? "text" : "password"} required placeholder="At least 6 characters"
                        value={password} onChange={e => setPassword(e.target.value)} className="glass-input glass-input-with-icon" />
                      <svg className="auth-input-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? (
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button type="button" onClick={handleNextStep} className="btn-primary" style={styles.submitBtn}>
                    Next Step
                  </button>
                </>
              ) : (
                /* ── STEP 2: Campus Info ── */
                <>
                  <div style={styles.field}>
                    <label style={styles.label}>Hostel / Location</label>
                    <div className="auth-input-wrapper">
                      <select value={hostel} onChange={e => setHostel(e.target.value)} className="glass-input glass-input-with-icon" style={{ appearance: 'none', WebkitAppearance: 'none' }}>
                        {hostelsList.map(h => <option key={h} value={h} style={styles.option}>{h}</option>)}
                      </select>
                      <svg className="auth-input-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Faculty</label>
                    <div className="auth-input-wrapper">
                      <select value={faculty} onChange={e => { setFaculty(e.target.value); setDepartment(''); }} className="glass-input glass-input-with-icon" style={{ appearance: 'none', WebkitAppearance: 'none' }}>
                        {facultiesList.map(f => <option key={f} value={f} style={styles.option}>{f}</option>)}
                      </select>
                      <svg className="auth-input-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                      </svg>
                    </div>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Department</label>
                    <div className="auth-input-wrapper">
                      <select value={department} required onChange={e => setDepartment(e.target.value)} className="glass-input glass-input-with-icon" style={{ appearance: 'none', WebkitAppearance: 'none' }}>
                        <option value="" disabled style={styles.option}>-- Select Department --</option>
                        {currentDepts.map(d => <option key={d} value={d} style={styles.option}>{d}</option>)}
                      </select>
                      <svg className="auth-input-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Matric Number</label>
                    <div className="auth-input-wrapper">
                      <input type="text" required placeholder="e.g. LCU/UG/22/12345"
                        value={matricNumber} onChange={e => setMatricNumber(e.target.value.toUpperCase())} className="glass-input glass-input-with-icon" />
                      <svg className="auth-input-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                    </div>
                    <span style={styles.hint}>Format: LCU/UG/YY/NNNNN</span>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Phone Number</label>
                    <div className="auth-input-wrapper">
                      <input type="tel" required maxLength="11" placeholder="e.g. 08012345678"
                        value={phoneNumber} onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))} className="glass-input glass-input-with-icon" />
                      <svg className="auth-input-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                  </div>

                  <div style={styles.checkboxContainer}>
                    <input type="checkbox" id="verify" checked={requestVerification}
                      onChange={e => setRequestVerification(e.target.checked)} style={styles.checkbox} />
                    <label htmlFor="verify" style={styles.checkboxLabel}>Request LCU student verification badge</label>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={() => setRegStep(1)} className="btn-secondary" style={{ flex: '1', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                      Back
                    </button>
                    <button type="submit" disabled={loading} className="btn-primary" style={{ flex: '2' }}>
                      {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                  </div>
                </>
              )}

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
                <div className="auth-input-wrapper">
                  <input type="email" required placeholder="e.g. yourname@lcu.edu.ng"
                    value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="glass-input glass-input-with-icon" />
                  <svg className="auth-input-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
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
                <div className="auth-input-wrapper">
                  <input type="text" required maxLength="6" placeholder="123456"
                    value={resetOtp} onChange={e => setResetOtp(e.target.value)}
                    className="glass-input glass-input-with-icon"
                    style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.4rem' }} />
                  <svg className="auth-input-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ left: '20px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>New Password</label>
                <div className="auth-input-wrapper">
                  <input type={showNewPassword ? "text" : "password"} required placeholder="At least 6 characters"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)} className="glass-input glass-input-with-icon" />
                  <svg className="auth-input-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <button type="button" className="password-toggle-btn" onClick={() => setShowNewPassword(!showNewPassword)}>
                    {showNewPassword ? (
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Confirm New Password</label>
                <div className="auth-input-wrapper">
                  <input type={showConfirmPassword ? "text" : "password"} required placeholder="Repeat your new password"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="glass-input glass-input-with-icon" />
                  <svg className="auth-input-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <button type="button" className="password-toggle-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? (
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
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
    </div>
  );
}

const styles = {
  pageWrapper: {
    minHeight: 'calc(100vh - 120px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '24px',
    padding: '16px',
    background: 'var(--bg-input)',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
  },
  logoImg: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    border: '2.5px solid rgba(59,130,246,0.5)',
    boxShadow: '0 0 16px rgba(59,130,246,0.2)',
    objectFit: 'cover',
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column',
  },
  logoTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 800,
    fontSize: '1.25rem',
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
  },
  logoSub: {
    fontSize: '0.55rem',
    letterSpacing: '0.22em',
    color: '#60a5fa', // Updated for premium blue/gold compatibility
    fontWeight: 700,
    textTransform: 'uppercase',
    marginTop: '2px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  title: {
    fontSize: '1.9rem',
    color: 'var(--text-primary)',
    marginBottom: '8px',
    fontFamily: 'var(--font-title)',
    fontWeight: '700',
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
    marginTop: '2px',
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
    color: 'var(--text-accent)',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '0',
    fontSize: '0.88rem',
  },
};
