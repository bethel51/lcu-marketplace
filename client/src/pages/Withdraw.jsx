import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config';

export default function Withdraw() {
  const { user, token, fetchProfile } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [banksList, setBanksList] = useState([]);
  const [withdrawBank, setWithdrawBank] = useState('');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawName, setWithdrawName] = useState('');
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const loadProfile = async () => {
    try {
      const profile = await fetchProfile();
      if (profile) {
        setProfileData(profile);
        setWithdrawBank(profile.payoutBankCode || '');
        setWithdrawAccount(profile.payoutAccountNumber || '');
        setWithdrawName(profile.payoutAccountName || '');
      }
    } catch (err) {
      showToast('Failed to load profile data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadProfile();
      
      // Fetch Nigerian banks
      fetch(`${API_URL}/api/payments/banks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setBanksList(data);
        })
        .catch(err => console.error('Error fetching bank lists:', err));
    }
  }, [token]);

  // Resolve bank account name dynamically
  useEffect(() => {
    if (withdrawAccount.length === 10 && withdrawBank) {
      const resolveAccount = async () => {
        setResolvingAccount(true);
        try {
          const res = await fetch(`${API_URL}/api/payments/verify-account`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ accountNumber: withdrawAccount, bankCode: withdrawBank })
          });
          const data = await res.json();
          if (res.ok && data.status === 'success') {
            setWithdrawName(data.accountName);
          } else {
            setWithdrawName('');
          }
        } catch {
          setWithdrawName('');
        } finally {
          setResolvingAccount(false);
        }
      };
      resolveAccount();
    } else {
      setWithdrawName('');
    }
  }, [withdrawAccount, withdrawBank, token]);

  const handleSaveBankDetails = async () => {
    if (!withdrawBank || !withdrawAccount || !withdrawName) {
      showToast('Please verify your bank details first', 'error');
      return;
    }
    setSavingBank(true);
    try {
      const selectedBankName = banksList.find(b => b.code === withdrawBank)?.name || withdrawBank;
      const res = await fetch(`${API_URL}/api/payments/save-bank-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bankCode: withdrawBank,
          bankName: selectedBankName,
          accountNumber: withdrawAccount,
          accountName: withdrawName
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Withdrawal bank details saved successfully! 🏦', 'success');
        loadProfile();
      } else {
        showToast(data.message || 'Failed to save bank settings', 'error');
      }
    } catch {
      showToast('Error saving bank settings', 'error');
    } finally {
      setSavingBank(false);
    }
  };

  const handleWithdrawFunds = async () => {
    if (!profileData?.payoutAccountNumber) {
      showToast('Please configure and save your withdrawal bank details first.', 'error');
      return;
    }
    if ((profileData?.walletBalance || 0) <= 0) {
      showToast('You have no funds available for withdrawal.', 'error');
      return;
    }
    setWithdrawing(true);
    try {
      const res = await fetch(`${API_URL}/api/payments/sweep-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Withdrawal completed successfully! 💸', 'success');
        loadProfile();
      } else {
        showToast(data.message || 'Withdrawal failed', 'error');
      }
    } catch {
      showToast('Error processing withdrawal', 'error');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }} className="container">
        <div style={{ width: '44px', height: '44px', border: '4px solid var(--border-color)', borderTop: '4px solid var(--gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading withdrawal details…</p>
      </div>
    );
  }

  const balance = profileData?.walletBalance || 0;

  return (
    <div style={styles.container} className="container animate-fade-in">
      <div style={styles.card} className="glass-panel">
        <button onClick={() => navigate('/profile')} style={styles.backBtn}>
          ← Back to Dashboard
        </button>
        <h2 style={styles.title}>💸 Withdraw Escrow Funds</h2>
        <p style={styles.subtitle}>
          Transfer your cleared marketplace earnings directly to your bank account or mobile wallet.
        </p>

        {/* Balance Card */}
        <div className="dash-wallet-card" style={styles.balanceCard}>
          <span className="dash-wallet-label" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Available Escrow Balance</span>
          <span className="dash-wallet-amount" style={{ fontSize: '2.5rem', fontWeight: '800', textShadow: '0 2px 10px rgba(59, 130, 246, 0.4)' }}>
            ₦{balance.toLocaleString()}
          </span>
          <button
            onClick={handleWithdrawFunds}
            disabled={withdrawing || balance <= 0 || !profileData?.payoutAccountNumber}
            className="btn-primary"
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: '700',
              width: '100%',
              borderRadius: '12px',
              boxShadow: balance > 0 && profileData?.payoutAccountNumber ? '0 8px 24px rgba(59, 130, 246, 0.4)' : 'none',
              background: balance > 0 && profileData?.payoutAccountNumber ? 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)' : 'rgba(255,255,255,0.1)',
              borderColor: 'transparent',
              cursor: (withdrawing || balance <= 0 || !profileData?.payoutAccountNumber) ? 'not-allowed' : 'pointer'
            }}
          >
            {withdrawing ? 'Processing Withdrawal...' : '💸 Withdraw Funds'}
          </button>
          {balance > 0 && !profileData?.payoutAccountNumber && (
            <p style={{ color: 'var(--warning)', fontSize: '0.78rem', marginTop: '8px', textAlign: 'center' }}>
              ⚠️ You must set up and save your bank details below before you can withdraw.
            </p>
          )}
        </div>

        {/* Bank Settings Form */}
        <div style={styles.formSection} className="dash-settings-section">
          <h3 style={styles.sectionTitle}>🏦 Withdrawal Bank Settings</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Verify and save your Nigerian bank account or mobile money details to secure your withdraw destination.
          </p>

          <div className="dash-settings-grid" style={styles.grid}>
            <div className="dash-settings-field" style={styles.field}>
              <label className="dash-settings-label">Select Bank / Provider</label>
              <select
                value={withdrawBank}
                onChange={e => { setWithdrawBank(e.target.value); setWithdrawName(''); }}
                className="glass-input"
                style={styles.select}
              >
                <option value="">-- Choose Provider --</option>
                {banksList.map(b => (
                  <option key={b.code} value={b.code} style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="dash-settings-field" style={styles.field}>
              <label className="dash-settings-label">Account Number</label>
              <input
                type="text"
                maxLength="10"
                placeholder="e.g. 0123456789"
                value={withdrawAccount}
                onChange={e => { setWithdrawAccount(e.target.value.replace(/\D/g, '')); setWithdrawName(''); }}
                className="glass-input"
              />
            </div>

            <div className="dash-settings-field" style={{ ...styles.field, gridColumn: 'span 2' }}>
              <label className="dash-settings-label">Verified Recipient Name</label>
              <input
                type="text"
                readOnly
                disabled
                placeholder={resolvingAccount ? '🔍 Resolving account details...' : 'Recipient name resolves automatically'}
                value={withdrawName}
                className="glass-input"
                style={{ background: 'rgba(255,255,255,0.02)', cursor: 'not-allowed', color: '#60a5fa', fontWeight: 'bold' }}
              />
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSaveBankDetails}
              disabled={savingBank || resolvingAccount || !withdrawName}
              className="btn-primary"
              style={{ padding: '12px 28px', fontSize: '0.9rem', borderRadius: '10px' }}
            >
              {savingBank ? 'Saving…' : '💾 Save Bank Details'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    paddingTop: '40px',
    paddingBottom: '80px',
    display: 'flex',
    justifyContent: 'center'
  },
  card: {
    width: '100%',
    maxWidth: '680px',
    padding: '36px',
    border: '1px solid var(--border-color)',
    borderRadius: '24px'
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-gray)',
    borderRadius: '10px',
    padding: '8px 16px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    marginBottom: '28px',
    transition: 'var(--transition-smooth)'
  },
  title: {
    fontSize: '2rem',
    color: 'var(--text-primary)',
    marginBottom: '8px'
  },
  subtitle: {
    color: 'var(--text-gray)',
    fontSize: '0.92rem',
    marginBottom: '32px',
    lineHeight: '1.5'
  },
  balanceCard: {
    width: '100%',
    padding: '28px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '36px'
  },
  formSection: {
    borderTop: '1px solid var(--border-color)',
    paddingTop: '32px'
  },
  sectionTitle: {
    fontSize: '1.25rem',
    color: 'var(--text-primary)',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    marginTop: '20px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  select: {
    width: '100%',
    cursor: 'pointer'
  }
};
