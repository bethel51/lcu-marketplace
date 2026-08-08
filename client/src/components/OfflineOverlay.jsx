import React, { useState, useEffect } from 'react';

export default function OfflineOverlay() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.card} className="glass-panel animate-fade-in">
        <div style={styles.icon}>📶</div>
        <h2 style={styles.title}>Connection Lost</h2>
        <p style={styles.message}>
          It looks like you've been disconnected. Please check your internet connection or campus Wi-Fi network and try again.
        </p>
        <button 
          onClick={() => {
            if (navigator.onLine) {
              setIsOffline(false);
            } else {
              // Pulse effect or check animation
              const button = document.getElementById('offline-retry-btn');
              if (button) {
                button.style.transform = 'scale(0.95)';
                setTimeout(() => { button.style.transform = 'scale(1)'; }, 150);
              }
            }
          }}
          id="offline-retry-btn"
          className="btn-primary"
          style={styles.button}
        >
          🔄 Retry Connection
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 12, 0.85)',
    backdropFilter: 'blur(12px)',
    zIndex: 99999,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 'calc(20px + env(safe-area-inset-top, 0px)) 20px calc(20px + env(safe-area-inset-bottom, 0px)) 20px',
  },
  card: {
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
    padding: '32px 24px',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  icon: {
    fontSize: '3.5rem',
    marginBottom: '16px',
    filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.4))',
    animation: 'pulse 2s infinite alternate',
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '10px',
  },
  message: {
    fontSize: '0.9rem',
    color: 'var(--text-gray)',
    lineHeight: '1.6',
    marginBottom: '24px',
  },
  button: {
    padding: '12px 28px',
    fontSize: '0.9rem',
    fontWeight: '700',
    borderRadius: '12px',
    transition: 'transform 0.15s ease',
    width: '100%',
  }
};
