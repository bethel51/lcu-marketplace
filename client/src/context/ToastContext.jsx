import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { API_URL } from '../config';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef(null);

  // ── Fetch notifications from backend ───────────────────────
  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      // Normalise fields: backend uses _id and createdAt
      const mapped = data.map(n => ({
        id: n._id,
        message: n.message,
        type: n.type || 'info',
        time: n.createdAt,
        read: n.read,
      }));
      setNotifications(mapped);
      setUnreadCount(mapped.filter(n => !n.read).length);
    } catch {
      // silent fail — don't block UI if network is offline
    }
  }, []);

  // ── Start/stop polling when token is present ───────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    // Immediate fetch on mount
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    pollRef.current = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(pollRef.current);
  }, [fetchNotifications]);

  // Re-trigger polling if user logs in after mount
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'token') {
        clearInterval(pollRef.current);
        if (e.newValue) {
          fetchNotifications();
          pollRef.current = setInterval(fetchNotifications, 30_000);
        } else {
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [fetchNotifications]);

  // ── Show a local toast (transient, client-only) ────────────
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    const entry = { id, message, type, time: new Date(), read: false };

    setToasts(prev => [...prev.slice(-4), entry]);

    // Also add to notification list locally so it's visible immediately
    setNotifications(prev => [entry, ...prev].slice(0, 50));
    setUnreadCount(c => c + 1);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Mark all as read — local state + backend
  const markAllRead = useCallback(async () => {
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/notifications/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
  }, []);

  // Clear all — local state + backend
  const clearNotifications = useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/notifications`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, notifications, unreadCount, markAllRead, clearNotifications, fetchNotifications }}>
      {children}

      {/* ── Premium Toast Container ─────────────────────────── */}
      <div className="toast-container">
        {toasts.map(t => (
          <Toast key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

function Toast({ toast, onRemove }) {
  const icons = {
    success: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    error: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    warning: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    info: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  };

  return (
    <div className={`toast-item toast-${toast.type}`}>
      <div className="toast-icon">{icons[toast.type] || icons.info}</div>
      <div className="toast-body">
        <span className="toast-message">{toast.message}</span>
      </div>
      <button className="toast-close" onClick={() => onRemove(toast.id)} aria-label="Close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <div className={`toast-progress toast-progress-${toast.type}`} />
    </div>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
