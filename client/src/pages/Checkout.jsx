import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config';

export default function Checkout() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user, fetchProfile } = useAuth();
  const { showToast } = useToast();

  const searchParams = new URLSearchParams(location.search);
  const amount = parseFloat(searchParams.get('amount') || '0');
  const type = searchParams.get('type') || 'buy'; // buy, boost, verification

  const [activeTab, setActiveTab] = useState('card'); // card, transfer, ussd
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('input'); // input, otp, success
  const [txRef, setTxRef] = useState('');

  // Card details state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardPin, setCardPin] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardType, setCardType] = useState('generic'); // visa, mastercard, generic

  // OTP state
  const [otp, setOtp] = useState('');

  // Bank Transfer state
  const [transferDetails, setTransferDetails] = useState(null);
  const [countdown, setCountdown] = useState(600); // 10 minutes

  // USSD state
  const [selectedBank, setSelectedBank] = useState('');
  const [ussdDetails, setUssdDetails] = useState(null);

  const bankUSSDs = [
    { code: '058', name: 'GTBank', ussd: '*737*1*2*' },
    { code: '011', name: 'First Bank', ussd: '*894*1*1*' },
    { code: '033', name: 'UBA', ussd: '*919*3*' },
    { code: '057', name: 'Zenith Bank', ussd: '*966*3*' },
    { code: '044', name: 'Access Bank', ussd: '*901*1*1*' }
  ];

  // Detect card type
  useEffect(() => {
    if (cardNumber.startsWith('4')) {
      setCardType('visa');
    } else if (/^5[1-5]/.test(cardNumber)) {
      setCardType('mastercard');
    } else {
      setCardType('generic');
    }
  }, [cardNumber]);

  // Bank Transfer Countdown timer
  useEffect(() => {
    if (activeTab !== 'transfer' || countdown <= 0 || !transferDetails) return;
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeTab, countdown, transferDetails]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    const formatted = value.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setCardExpiry(value);
  };

  const handleCvvChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 3) value = value.slice(0, 3);
    setCardCvv(value);
  };

  const handlePinChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    setCardPin(value);
  };

  const fetchTransferDetails = async () => {
    if (transferDetails) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/payments/charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderId, method: 'bank_transfer' })
      });
      const data = await res.json();
      if (res.ok) {
        setTransferDetails(data);
        setTxRef(data.txRef);
      } else {
        showToast(data.message || 'Error fetching transfer details', 'error');
      }
    } catch {
      showToast('Network error fetching transfer details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBankSelect = async (bankCode) => {
    setSelectedBank(bankCode);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/payments/charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderId, method: 'ussd', bankCode })
      });
      const data = await res.json();
      if (res.ok) {
        setUssdDetails(data);
        setTxRef(data.txRef);
      } else {
        showToast(data.message || 'Error generating USSD code', 'error');
      }
    } catch {
      showToast('Network error generating USSD code', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePayCard = async (e) => {
    e.preventDefault();
    if (cardNumber.replace(/\s/g, '').length < 16 || cardExpiry.length < 5 || cardCvv.length < 3 || cardPin.length < 4) {
      showToast('Please enter all card details correctly', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/payments/charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId,
          method: 'card',
          cardDetails: { cardNumber, cardExpiry, cardCvv, cardPin }
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'OTP_REQUIRED') {
        setTxRef(data.txRef);
        setStep('otp');
        showToast('OTP Required. Check your phone/email (Demo OTP is 123456)', 'info');
      } else {
        showToast(data.message || 'Payment initialization failed', 'error');
      }
    } catch {
      showToast('Network error processing payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 6) {
      showToast('Please enter the 6-digit OTP code', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/payments/verify-custom-charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          txRef,
          method: 'card',
          otp
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(type === 'pro_upgrade' ? '⭐ Welcome to PRO! Redirecting to your new dashboard...' : 'Payment verified successfully!', 'success');
        setStep('success');
        // Refresh profile so AuthContext picks up isPro = true
        await fetchProfile();
        setTimeout(() => {
          navigate(type === 'pro_upgrade' ? '/pro-dashboard' : '/profile');
        }, 2000);
      } else {
        showToast(data.message || 'OTP verification failed', 'error');
      }
    } catch {
      showToast('Error verifying OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTransfer = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/payments/verify-custom-charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          txRef,
          method: 'bank_transfer'
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(type === 'pro_upgrade' ? '⭐ Welcome to PRO! Redirecting to your new dashboard...' : 'Transfer payment verified successfully!', 'success');
        setStep('success');
        await fetchProfile();
        setTimeout(() => {
          navigate(type === 'pro_upgrade' ? '/pro-dashboard' : '/profile');
        }, 2000);
      } else {
        showToast(data.message || 'Payment verification failed', 'error');
      }
    } catch {
      showToast('Error confirming payment transfer', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUssd = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/payments/verify-custom-charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          txRef,
          method: 'ussd'
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(type === 'pro_upgrade' ? '⭐ Welcome to PRO! Redirecting to your new dashboard...' : 'USSD payment verified successfully!', 'success');
        setStep('success');
        await fetchProfile();
        setTimeout(() => {
          navigate(type === 'pro_upgrade' ? '/pro-dashboard' : '/profile');
        }, 2000);
      } else {
        showToast(data.message || 'USSD verification failed', 'error');
      }
    } catch {
      showToast('Error verifying USSD transaction', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page-root">
      <style>{`
        .checkout-page-root {
          min-height: 100vh;
          background: #080e1b;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          font-family: 'Outfit', sans-serif;
        }
        .checkout-wrapper {
          display: flex;
          width: 100%;
          max-width: 1000px;
          background: rgba(20, 27, 45, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(20px);
        }
        .checkout-left-summary {
          flex: 1;
          background: rgba(13, 19, 34, 0.8);
          padding: 40px;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .checkout-right-portal {
          flex: 1.2;
          padding: 40px;
          display: flex;
          flex-direction: column;
        }
        .summary-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 30px;
        }
        .summary-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: #fff;
        }
        .merchant-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #10b981;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .item-details-box {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 24px 0;
          margin: 24px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 14px;
          font-size: 0.9rem;
          color: #9ca3af;
        }
        .detail-val-highlight {
          color: #fff;
          font-weight: 600;
        }
        .total-pay-box {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 20px;
        }
        .total-pay-val {
          font-size: 2rem;
          font-weight: 800;
          color: var(--gold);
        }
        .secure-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #6b7280;
          font-size: 0.78rem;
          margin-top: 40px;
        }
        .portal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        .cancel-link {
          color: #9ca3af;
          text-decoration: none;
          font-size: 0.88rem;
          cursor: pointer;
          transition: color 0.2s;
        }
        .cancel-link:hover {
          color: #ef4444;
        }
        .checkout-methods-tabs {
          display: flex;
          gap: 8px;
          background: rgba(13, 19, 34, 0.6);
          padding: 6px;
          border-radius: 12px;
          margin-bottom: 30px;
        }
        .checkout-method-tab {
          flex: 1;
          background: transparent;
          border: none;
          color: #9ca3af;
          padding: 12px;
          font-size: 0.88rem;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .checkout-method-tab.active {
          background: var(--gold);
          color: #0d1322;
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.25);
        }
        .payment-panel {
          animation: fadeIn 0.3s ease-in-out;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 1px;
          color: #9ca3af;
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        .form-input-custom {
          width: 100%;
          background: rgba(13, 19, 34, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 14px;
          color: #fff;
          font-size: 0.95rem;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-input-custom:focus {
          border-color: var(--gold);
        }
        .form-row-custom {
          display: flex;
          gap: 16px;
        }
        .form-row-custom > div {
          flex: 1;
        }
        .card-preview-container {
          perspective: 1000px;
          margin-bottom: 30px;
        }
        .payment-card-visual {
          width: 100%;
          height: 180px;
          border-radius: 15px;
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          position: relative;
          transition: transform 0.6s;
          transform-style: preserve-3d;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
        }
        .payment-card-visual.flipped {
          transform: rotateY(180deg);
        }
        .card-side {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .card-side-back {
          transform: rotateY(180deg);
          background: linear-gradient(135deg, #1f2937, #111827);
        }
        .card-brand {
          font-size: 1.4rem;
          font-weight: 800;
          font-style: italic;
          text-align: right;
          text-transform: uppercase;
        }
        .card-chip {
          width: 38px;
          height: 28px;
          background: #f59e0b;
          border-radius: 6px;
        }
        .card-num-text {
          font-size: 1.25rem;
          letter-spacing: 2px;
          font-family: monospace;
        }
        .card-holder-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
        }
        .transfer-widget {
          background: rgba(13, 19, 34, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .transfer-widget-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .transfer-widget-row:last-child {
          border-bottom: none;
        }
        .transfer-widget-label {
          font-size: 0.85rem;
          color: #9ca3af;
        }
        .transfer-widget-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: #fff;
        }
        .btn-payment-action {
          width: 100%;
          background: var(--gold);
          color: #0d1322;
          border: none;
          border-radius: 12px;
          padding: 16px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .btn-payment-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(212, 175, 55, 0.35);
        }
        .btn-payment-action:disabled {
          background: #374151;
          color: #9ca3af;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media(max-width: 850px) {
          .checkout-wrapper {
            flex-direction: column;
          }
          .checkout-left-summary {
            border-right: none;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }
        }
      `}</style>

      <div className="checkout-wrapper">
        {/* Left Side Summary Panel */}
        <div className="checkout-left-summary">
          <div>
            <div className="summary-header">
              <span className="summary-title">Merchant Checkout</span>
              <span className="merchant-badge">🛡️ Secured</span>
            </div>
            
            <p style={{ fontSize: '0.88rem', color: '#9ca3af', lineHeight: '1.5' }}>
              You are completing a payment for LCU Marketplace Student Trade portal. This transaction is processed via secure escrow.
            </p>

            <div className="item-details-box">
              <div className="detail-row">
                <span>Payment Reference</span>
                <span className="detail-val-highlight">{orderId?.slice(-8).toUpperCase()}</span>
              </div>
              <div className="detail-row">
                <span>Transaction Type</span>
                <span className="detail-val-highlight" style={{ textTransform: 'capitalize' }}>
                  {type === 'buy' ? 'Product Purchase' : type === 'boost' ? 'Listing Boost' : 'Account Verification'}
                </span>
              </div>
              <div className="detail-row">
                <span>Account Status</span>
                <span className="detail-val-highlight" style={{ color: '#10b981' }}>Active Escrow</span>
              </div>
            </div>
          </div>

          <div>
            <div className="total-pay-box">
              <span style={{ fontSize: '0.9rem', color: '#9ca3af' }}>Total Payable</span>
              <span className="total-pay-val">₦{amount.toLocaleString()}</span>
            </div>
            <div className="secure-footer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Escrow Security Certified • 256-Bit SSL</span>
            </div>
          </div>
        </div>

        {/* Right Side Checkout Portal */}
        <div className="checkout-right-portal">
          <div className="portal-header">
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Select Payment Method</h2>
            <span className="cancel-link" onClick={() => navigate(-1)}>✕ Cancel</span>
          </div>

          {step === 'input' && (
            <>
              <div className="checkout-methods-tabs">
                <button
                  className={`checkout-method-tab ${activeTab === 'card' ? 'active' : ''}`}
                  onClick={() => setActiveTab('card')}
                >
                  💳 Card
                </button>
                <button
                  className={`checkout-method-tab ${activeTab === 'transfer' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('transfer'); fetchTransferDetails(); }}
                >
                  🏦 Transfer
                </button>
                <button
                  className={`checkout-method-tab ${activeTab === 'ussd' ? 'active' : ''}`}
                  onClick={() => setActiveTab('ussd')}
                >
                  📱 USSD
                </button>
              </div>

              <div className="payment-panel">
                {activeTab === 'card' && (
                  <form onSubmit={handlePayCard}>
                    {/* Card Mockup Visual */}
                    <div className="card-preview-container">
                      <div className={`payment-card-visual ${isFlipped ? 'flipped' : ''}`}>
                        {/* Front Side */}
                        <div className="card-side">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="card-chip"></div>
                            <span className="card-brand">{cardType}</span>
                          </div>
                          <div className="card-num-text">{cardNumber || '•••• •••• •••• ••••'}</div>
                          <div className="card-holder-row">
                            <span>CARD HOLDER</span>
                            <span>EXPIRES</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span>{user?.name || 'STUDENT NAME'}</span>
                            <span>{cardExpiry || 'MM/YY'}</span>
                          </div>
                        </div>
                        {/* Back Side */}
                        <div className="card-side card-side-back">
                          <div style={{ background: '#000', height: '35px', margin: '0 -24px', marginTop: '10px' }} />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>CVV</span>
                            <div style={{ background: '#fff', color: '#000', padding: '6px 12px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                              {cardCvv || '•••'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Card Number</label>
                      <input
                        type="text"
                        className="form-input-custom"
                        placeholder="4111 2222 3333 4444"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        onFocus={() => setIsFlipped(false)}
                        required
                      />
                    </div>

                    <div className="form-row-custom">
                      <div className="form-group">
                        <label>Expiry Date</label>
                        <input
                          type="text"
                          className="form-input-custom"
                          placeholder="MM/YY"
                          maxLength={5}
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          onFocus={() => setIsFlipped(false)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>CVV</label>
                        <input
                          type="text"
                          className="form-input-custom"
                          placeholder="123"
                          maxLength={3}
                          value={cardCvv}
                          onChange={handleCvvChange}
                          onFocus={() => setIsFlipped(true)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Card PIN</label>
                      <input
                        type="password"
                        className="form-input-custom"
                        placeholder="••••"
                        maxLength={4}
                        value={cardPin}
                        onChange={handlePinChange}
                        onFocus={() => setIsFlipped(false)}
                        required
                      />
                    </div>

                    <button type="submit" className="btn-payment-action" disabled={loading}>
                      {loading ? 'Processing Securely...' : `Pay ₦${amount.toLocaleString()}`}
                    </button>
                  </form>
                )}

                {activeTab === 'transfer' && (
                  <div>
                    {loading ? (
                      <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--gold)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }} />
                        <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Generating secure transfer bank account details...</p>
                      </div>
                    ) : (
                      <>
                        <div className="transfer-widget">
                          <div className="transfer-widget-row">
                            <span className="transfer-widget-label">Bank Name</span>
                            <span className="transfer-widget-value">{transferDetails?.bankName || 'Wema Bank'}</span>
                          </div>
                          <div className="transfer-widget-row">
                            <span className="transfer-widget-label">Account Number</span>
                            <span className="transfer-widget-value" style={{ fontSize: '1.15rem', color: 'var(--gold)', letterSpacing: '1px' }}>
                              {transferDetails?.accountNumber || '0123456789'}
                            </span>
                          </div>
                          <div className="transfer-widget-row">
                            <span className="transfer-widget-label">Account Name</span>
                            <span className="transfer-widget-value">{transferDetails?.accountName || 'LCU ESCROW TRADE'}</span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'center', marginBottom: '25px', color: '#9ca3af', fontSize: '0.85rem', lineHeight: '1.5' }}>
                          <p>⏱️ This session expires in <strong style={{ color: '#ef4444' }}>{formatTime(countdown)}</strong></p>
                          <p style={{ marginTop: '8px' }}>Please transfer ₦{amount.toLocaleString()} from your bank app, then click the confirm button below.</p>
                        </div>

                        <button className="btn-payment-action" onClick={handleConfirmTransfer} disabled={loading}>
                          Confirm Transfer Payment
                        </button>
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'ussd' && (
                  <div>
                    <div className="form-group">
                      <label>Select Bank</label>
                      <select
                        className="form-input-custom"
                        value={selectedBank}
                        onChange={(e) => handleBankSelect(e.target.value)}
                        style={{ background: '#0d1322', color: '#fff' }}
                      >
                        <option value="">-- Select Bank --</option>
                        {bankUSSDs.map(b => (
                          <option key={b.code} value={b.code}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    {selectedBank && ussdDetails && (
                      <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '12px', padding: '24px', textAlign: 'center', marginTop: '20px', animation: 'fadeIn 0.3s' }}>
                        <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '12px' }}>Dial this code on your registered mobile line:</p>
                        <div style={{ fontFamily: 'monospace', fontSize: '1.5rem', color: 'var(--gold)', letterSpacing: '1px', fontWeight: 'bold', margin: '14px 0' }}>
                          {ussdDetails.ussdCode}
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '10px' }}>
                          Complete the authentication steps on your phone, then confirm below.
                        </p>

                        <button
                          className="btn-payment-action"
                          onClick={handleConfirmUssd}
                          style={{ marginTop: '20px' }}
                          disabled={loading}
                        >
                          Verify USSD Transaction
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {step === 'otp' && (
            <div className="payment-panel">
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '12px' }}>🔒 OTP Verification</h3>
              <p style={{ fontSize: '0.88rem', color: '#9ca3af', marginBottom: '24px', lineHeight: '1.5' }}>
                We have sent an authentication PIN to your mobile/email. Please input it below to complete authorization.
              </p>

              <form onSubmit={handleVerifyOtp}>
                <div className="form-group">
                  <label>One-Time PIN</label>
                  <input
                    type="text"
                    className="form-input-custom"
                    placeholder="123456"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.4rem' }}
                    required
                  />
                </div>

                <button type="submit" className="btn-payment-action" style={{ background: '#10b981', color: '#fff' }} disabled={loading}>
                  {loading ? 'Verifying Transaction...' : 'Confirm & Authorize'}
                </button>
              </form>
            </div>
          )}

          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '40px 20px', animation: 'fadeIn 0.3s' }}>
              <div style={{ fontSize: '4.5rem', color: '#10b981', marginBottom: '20px' }}>✓</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '8px' }}>Payment Approved!</h3>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '20px' }}>
                Your payment of ₦{amount.toLocaleString()} was successful. You are being redirected to your dashboard...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
