import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config';

export default function CheckoutModal({ isOpen, onClose, orderId, amount, onSuccess }) {
  const { token } = useAuth();
  const { showToast } = useToast();

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

  // Format seconds to MM:SS
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
        showToast(data.message || 'Error fetching transfer account', 'error');
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
        showToast('Payment verified successfully!', 'success');
        setStep('success');
        setTimeout(() => {
          onSuccess(data.order);
          onClose();
        }, 1500);
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
        showToast('Transfer payment verified successfully!', 'success');
        setStep('success');
        setTimeout(() => {
          onSuccess(data.order);
          onClose();
        }, 1500);
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
        showToast('USSD payment verified successfully!', 'success');
        setStep('success');
        setTimeout(() => {
          onSuccess(data.order);
          onClose();
        }, 1500);
      } else {
        showToast(data.message || 'USSD verification failed', 'error');
      }
    } catch {
      showToast('Error verifying USSD transaction', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="custom-checkout-overlay">
      <style>{`
        .custom-checkout-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          background: rgba(8, 14, 27, 0.85);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.3s ease-out;
        }
        .custom-checkout-container {
          background: rgba(20, 27, 45, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          width: 100%;
          max-width: 460px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          color: #ffffff;
        }
        .checkout-header {
          padding: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .checkout-header h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.25rem;
          margin: 0;
        }
        .close-btn {
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 1.5rem;
          cursor: pointer;
          transition: color 0.2s;
        }
        .close-btn:hover {
          color: #ffffff;
        }
        .checkout-amount-summary {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.05));
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
        }
        .checkout-tabs {
          display: flex;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .checkout-tab-btn {
          flex: 1;
          padding: 14px;
          border: none;
          background: none;
          color: #9ca3af;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          font-size: 0.9rem;
        }
        .checkout-tab-btn.active {
          color: #3b82f6;
          border-bottom: 2px solid #3b82f6;
          background: rgba(59, 130, 246, 0.04);
        }
        .checkout-body {
          padding: 24px;
        }
        
        .card-view-wrapper {
          perspective: 1000px;
          width: 100%;
          height: 170px;
          margin-bottom: 20px;
        }
        .credit-card-3d {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 14px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        }
        .credit-card-3d.flipped {
          transform: rotateY(180deg);
        }
        .card-front, .card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 14px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .card-front {
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
        }
        .card-back {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          transform: rotateY(180deg);
          justify-content: center;
        }
        .card-chip {
          width: 40px;
          height: 30px;
          background: #d4af37;
          border-radius: 6px;
        }
        .card-number-display {
          font-family: 'Outfit', monospace;
          font-size: 1.4rem;
          letter-spacing: 2px;
          margin: 15px 0;
        }
        .card-footer-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.8);
        }
        .magnetic-stripe {
          background: #000;
          height: 35px;
          margin-left: -20px;
          margin-right: -20px;
          margin-top: -10px;
        }
        .cvv-strip {
          background: rgba(255, 255, 255, 0.2);
          padding: 8px;
          border-radius: 4px;
          text-align: right;
          font-family: monospace;
          font-size: 0.9rem;
          letter-spacing: 1px;
          margin-top: 15px;
        }
        
        .input-group {
          margin-bottom: 16px;
        }
        .input-group label {
          display: block;
          font-size: 0.8rem;
          color: #9ca3af;
          margin-bottom: 6px;
        }
        .input-row {
          display: flex;
          gap: 12px;
        }
        .custom-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 10px 14px;
          color: #fff;
          font-size: 0.95rem;
          outline: none;
          transition: border 0.2s;
        }
        .custom-input:focus {
          border-color: #3b82f6;
        }
        .btn-pay-action {
          width: 100%;
          background: #3b82f6;
          color: white;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-pay-action:hover:not(:disabled) {
          background: #2563eb;
        }
        .btn-pay-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .transfer-details-box {
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .transfer-detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 0.9rem;
        }
        .transfer-detail-val {
          font-weight: 600;
          color: #60a5fa;
        }
        
        .ussd-box {
          background: rgba(59, 130, 246, 0.05);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 10px;
          padding: 16px;
          text-align: center;
          margin-top: 16px;
        }
        .ussd-code-display {
          font-family: monospace;
          font-size: 1.3rem;
          color: #60a5fa;
          letter-spacing: 1px;
          margin: 10px 0;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <div className="custom-checkout-container">
        <div className="checkout-header">
          <h3>LCU Checkout Portal</h3>
          <button className="close-btn" onClick={onClose} disabled={loading}>&times;</button>
        </div>

        <div className="checkout-amount-summary">
          <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Amount to Pay</span>
          <span style={{ fontSize: '1.2rem', color: '#10b981' }}>₦{amount.toLocaleString()}</span>
        </div>

        {step === 'input' && (
          <>
            <div className="checkout-tabs">
              <button
                className={`checkout-tab-btn ${activeTab === 'card' ? 'active' : ''}`}
                onClick={() => { setActiveTab('card'); setStep('input'); }}
              >
                💳 Card
              </button>
              <button
                className={`checkout-tab-btn ${activeTab === 'transfer' ? 'active' : ''}`}
                onClick={() => { setActiveTab('transfer'); fetchTransferDetails(); }}
              >
                🏦 Bank Transfer
              </button>
              <button
                className={`checkout-tab-btn ${activeTab === 'ussd' ? 'active' : ''}`}
                onClick={() => { setActiveTab('ussd'); }}
              >
                📱 USSD
              </button>
            </div>

            <div className="checkout-body">
              {activeTab === 'card' && (
                <form onSubmit={handlePayCard}>
                  <div className="card-view-wrapper">
                    <div className={`credit-card-3d ${isFlipped ? 'flipped' : ''}`}>
                      <div className="card-front">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="card-chip" />
                          <span style={{ fontStyle: 'italic', fontWeight: 'bold' }}>
                            {cardType === 'visa' && 'VISA'}
                            {cardType === 'mastercard' && 'MasterCard'}
                            {cardType === 'generic' && 'PAYMENT'}
                          </span>
                        </div>
                        <div className="card-number-display">
                          {cardNumber || '•••• •••• •••• ••••'}
                        </div>
                        <div className="card-footer-info">
                          <div>
                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)' }}>CARDHOLDER</div>
                            <div>LCU STUDENT</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)' }}>EXPIRES</div>
                            <div>{cardExpiry || 'MM/YY'}</div>
                          </div>
                        </div>
                      </div>
                      <div className="card-back">
                        <div className="magnetic-stripe" />
                        <div className="cvv-strip">
                          <span style={{ color: '#000', marginRight: '6px' }}>CVV</span>
                          <span style={{ fontWeight: 'bold' }}>{cardCvv || '•••'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="input-group">
                    <label>CARD NUMBER</label>
                    <input
                      type="text"
                      className="custom-input"
                      placeholder="4000 1234 5678 9010"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      onFocus={() => setIsFlipped(false)}
                      required
                    />
                  </div>

                  <div className="input-row">
                    <div className="input-group" style={{ flex: 1 }}>
                      <label>EXPIRY DATE</label>
                      <input
                        type="text"
                        className="custom-input"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        onFocus={() => setIsFlipped(false)}
                        required
                      />
                    </div>
                    <div className="input-group" style={{ flex: 1 }}>
                      <label>CVV</label>
                      <input
                        type="password"
                        className="custom-input"
                        placeholder="123"
                        value={cardCvv}
                        onChange={handleCvvChange}
                        onFocus={() => setIsFlipped(true)}
                        required
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>CARD PIN</label>
                    <input
                      type="password"
                      className="custom-input"
                      placeholder="••••"
                      value={cardPin}
                      onChange={handlePinChange}
                      onFocus={() => setIsFlipped(false)}
                      required
                    />
                  </div>

                  <button type="submit" className="btn-pay-action" disabled={loading}>
                    {loading ? 'Processing...' : `Pay ₦${amount.toLocaleString()}`}
                  </button>
                </form>
              )}

              {activeTab === 'transfer' && (
                <div>
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                      <p>Generating dynamic bank transfer account details...</p>
                    </div>
                  ) : (
                    <>
                      <div className="transfer-details-box">
                        <div className="transfer-detail-row">
                          <span>Bank Name</span>
                          <span className="transfer-detail-val">{transferDetails?.bankName}</span>
                        </div>
                        <div className="transfer-detail-row">
                          <span>Account Number</span>
                          <span className="transfer-detail-val" style={{ fontSize: '1.1rem', letterSpacing: '1px' }}>
                            {transferDetails?.accountNumber}
                          </span>
                        </div>
                        <div className="transfer-detail-row">
                          <span>Account Name</span>
                          <span className="transfer-detail-val">{transferDetails?.accountName}</span>
                        </div>
                        <div className="transfer-detail-row">
                          <span>Amount</span>
                          <span className="transfer-detail-val">₦{amount.toLocaleString()}</span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'center', marginBottom: '20px', color: '#9ca3af', fontSize: '0.85rem' }}>
                        <p>⏱️ This transfer details expires in <strong style={{ color: '#ef4444' }}>{formatTime(countdown)}</strong></p>
                        <p style={{ marginTop: '8px' }}>Please make the transfer from your bank app, then click the confirmation button below.</p>
                      </div>

                      <button className="btn-pay-action" onClick={handleConfirmTransfer} disabled={loading}>
                        I have made this transfer
                      </button>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'ussd' && (
                <div>
                  <div className="input-group">
                    <label>SELECT BANK</label>
                    <select
                      className="custom-input"
                      value={selectedBank}
                      onChange={(e) => handleBankSelect(e.target.value)}
                      style={{ background: '#141b2d', color: '#fff' }}
                    >
                      <option value="">-- Select Bank --</option>
                      {bankUSSDs.map(b => (
                        <option key={b.code} value={b.code}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedBank && ussdDetails && (
                    <div className="ussd-box">
                      <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Dial the code below on your mobile device:</p>
                      <div className="ussd-code-display">
                        {ussdDetails.ussdCode}
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '10px' }}>
                        Click Confirm after dialing and completing payment on your device.
                      </p>

                      <button
                        className="btn-pay-action"
                        onClick={handleConfirmUssd}
                        style={{ marginTop: '16px' }}
                        disabled={loading}
                      >
                        Confirm Payment
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {step === 'otp' && (
          <div className="checkout-body">
            <h4 style={{ fontFamily: 'Outfit', marginBottom: '10px' }}>OTP Verification</h4>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '20px' }}>
              We have sent a verification code to your email/phone number. Please enter it below to complete this transaction.
            </p>

            <form onSubmit={handleVerifyOtp}>
              <div className="input-group">
                <label>ENTER 6-DIGIT OTP</label>
                <input
                  type="text"
                  className="custom-input"
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>

              <button type="submit" className="btn-pay-action" style={{ background: '#10b981' }} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Complete'}
              </button>
            </form>
          </div>
        )}

        {step === 'success' && (
          <div className="checkout-body" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '3.5rem', color: '#10b981', marginBottom: '15px' }}>✓</div>
            <h4 style={{ fontFamily: 'Outfit', fontSize: '1.25rem', marginBottom: '8px' }}>Payment Successful!</h4>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
              Your payment of ₦{amount.toLocaleString()} has been processed successfully.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
