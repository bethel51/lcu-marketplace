import React, { createContext, useContext, useState } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove toast after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Notification Container */}
      <div style={styles.toastContainer}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              ...styles.toast,
              ...styles[t.type]
            }}
            className="glass-panel animate-fade-in"
          >
            <div style={styles.toastContent}>
              <span style={styles.emoji}>
                {t.type === 'success' && '✓'}
                {t.type === 'error' && '✕'}
                {t.type === 'warning' && '⚠️'}
                {t.type === 'info' && 'ℹ️'}
              </span>
              <span>{t.message}</span>
            </div>
            <button onClick={() => removeToast(t.id)} style={styles.closeBtn}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = {
  toastContainer: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    pointerEvents: 'none',
  },
  toast: {
    pointerEvents: 'auto',
    padding: '14px 20px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: '280px',
    maxWidth: '400px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.3s ease',
  },
  toastContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  emoji: {
    fontSize: '1rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.5)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    padding: '4px',
    marginLeft: '12px',
    transition: 'color 0.2s ease',
  },
  success: {
    borderLeft: '4px solid #10b981',
    background: 'rgba(16, 185, 129, 0.12)',
  },
  error: {
    borderLeft: '4px solid #ef4444',
    background: 'rgba(239, 68, 68, 0.12)',
  },
  warning: {
    borderLeft: '4px solid #f59e0b',
    background: 'rgba(245, 158, 11, 0.12)',
  },
  info: {
    borderLeft: '4px solid #3b82f6',
    background: 'rgba(59, 130, 246, 0.12)',
  }
};
