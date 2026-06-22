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
  const [faculty, setFaculty] = useState('Information Technology & Applied Sciences');
  const [department, setDepartment] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
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
        // Validate matric number format
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

  const departmentsByFaculty = {
    'Information Technology & Applied Sciences': [
      'Computer Science',
      'Information Technology',
      'Cyber Security',
      'Software Engineering',
      'Biochemistry',
      'Industrial Chemistry',
      'Microbiology',
      'Physics with Electronics',
    ],
    'Basic Medical & Health Sciences': [
      'Medicine & Surgery',
      'Nursing Science',
      'Medical Laboratory Science',
      'Pharmacology',
      'Physiotherapy',
      'Public Health',
    ],
    'Social & Management Sciences': [
      'Accounting',
      'Banking & Finance',
      'Business Administration',
      'Economics',
      'Mass Communication',
      'Political Science',
      'Sociology',
    ],
    'Arts, Education & Humanities': [
      'English Language',
      'History & International Studies',
      'Philosophy',
      'Education & English',
      'Education & Mathematics',
    ],
    'Law': ['Law'],
  };
  const currentDepts = departmentsByFaculty[faculty] || [];

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
                      onChange={(e) => { setFaculty(e.target.value); setDepartment(''); }}
                      className="glass-input"
                      style={styles.select}
                    >
                      {facultiesList.map(f => (
                        <option key={f} value={f} style={styles.option}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Department</label>
                    <select
                      value={department}
                      required
                      onChange={(e) => setDepartment(e.target.value)}
                      className="glass-input"
                      style={styles.select}
                    >
                      <option value="" disabled style={styles.option}>-- Select Department --</option>
                      {currentDepts.map(d => (
                        <option key={d} value={d} style={styles.option}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Matric Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. LCU/UG/22/12345"
                      value={matricNumber}
                      onChange={(e) => setMatricNumber(e.target.value.toUpperCase())}
                      className="glass-input"
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #888)' }}>
                      Format: LCU/UG/YY/NNNNN (e.g. LCU/UG/22/12345)
                    </span>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Phone Number</label>
                    <input
                      type="tel"
                      required
                      maxLength="11"
                      placeholder="e.g. 08012345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      className="glass-input"
                    />
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
                      Request LCU student verification badge
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
    maxWidth: '540px',
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
