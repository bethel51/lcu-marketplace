import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import './App.css';

// ── Lazy-load all pages (code-split per route) ─────────────────
const Landing        = lazy(() => import('./pages/Landing'));
const Marketplace    = lazy(() => import('./pages/Marketplace'));
const Auth           = lazy(() => import('./pages/Auth'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const PostProduct    = lazy(() => import('./pages/PostProduct'));
const Dashboard      = lazy(() => import('./pages/Dashboard'));
const Chat           = lazy(() => import('./pages/Chat'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminLogin     = lazy(() => import('./pages/AdminLogin'));

// ── Dismiss the pre-React HTML shell once React boots ──────────
function dismissShell() {
  const shell    = document.getElementById('app-shell');
  const progress = document.getElementById('app-progress');
  if (progress) {
    progress.style.width = '100%';
    setTimeout(() => { if (progress) progress.style.opacity = '0'; }, 300);
    setTimeout(() => { if (progress) progress.remove(); }, 700);
  }
  if (shell) {
    shell.classList.add('hidden');
    setTimeout(() => { if (shell) shell.remove(); }, 400);
  }
}

// ── Top progress bar for route transitions ─────────────────────
function TopProgressBar() {
  const location = useLocation();
  const barRef   = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    // Start: shoot to 75%
    bar.style.transition = 'none';
    bar.style.width      = '0%';
    bar.style.opacity    = '1';
    // Force reflow
    bar.getBoundingClientRect();
    bar.style.transition = 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
    bar.style.width      = '75%';

    // Finish: go to 100% then fade out
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      bar.style.transition = 'width 0.2s ease, opacity 0.3s ease 0.2s';
      bar.style.width      = '100%';
      setTimeout(() => { bar.style.opacity = '0'; }, 400);
    }, 400);

    return () => clearTimeout(timerRef.current);
  }, [location.pathname]);

  return (
    <div
      ref={barRef}
      style={{
        position:     'fixed',
        top:          0,
        left:         0,
        zIndex:       9999,
        height:       '3px',
        width:        '0%',
        opacity:      0,
        background:   'linear-gradient(90deg, #1d4ed8, #3b82f6, #60a5fa)',
        borderRadius: '0 3px 3px 0',
        boxShadow:    '0 0 12px rgba(59,130,246,0.8)',
        pointerEvents:'none',
      }}
    />
  );
}

// ── Scroll to top on every route change ───────────────────────
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

// ── Premium in-app page loader (Suspense fallback) ────────────
function PageLoader() {
  return (
    <div className="page-loader">
      <div className="page-loader-spinner" />
      <div className="page-loader-skeletons">
        <div className="page-loader-skel" style={{ width: '60%' }} />
        <div className="page-loader-skel" style={{ width: '80%' }} />
        <div className="page-loader-skel" style={{ width: '50%' }} />
      </div>
    </div>
  );
}

// ── Route guards ───────────────────────────────────────────────
function PrivateRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  if (user.isAdmin) return <Navigate to="/admin" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  return user && user.isAdmin ? children : <Navigate to="/admin-login" replace />;
}

// ── Main App Shell ─────────────────────────────────────────────
function AppContent() {
  // Dismiss the pre-React HTML shell on first mount
  useEffect(() => {
    dismissShell();
  }, []);

  return (
    <Router>
      <TopProgressBar />
      <ScrollToTop />
      <div style={styles.app}>
        <Navbar />
        <div style={styles.main}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/"            element={<Landing />} />
              <Route path="/auth"        element={<Auth />} />
              <Route path="/admin-login" element={<AdminLogin />} />

              {/* Protected student routes */}
              <Route path="/marketplace" element={<PrivateRoute><Marketplace /></PrivateRoute>} />
              <Route path="/product/:id" element={<PrivateRoute><ProductDetails /></PrivateRoute>} />
              <Route path="/post"        element={<PrivateRoute><PostProduct /></PrivateRoute>} />
              <Route path="/edit/:id"    element={<PrivateRoute><PostProduct /></PrivateRoute>} />
              <Route path="/profile"     element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/chat"        element={<PrivateRoute><Chat /></PrivateRoute>} />

              {/* Admin */}
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
        <footer style={styles.footer}>
          <p>© {new Date().getFullYear()} Lead City University Student Marketplace Hub. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

const styles = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  main: {
    flexGrow: 1,
  },
  footer: {
    textAlign: 'center',
    padding: '24px',
    borderTop: '1px solid var(--border-color)',
    color: 'var(--text-gray)',
    fontSize: '0.8rem',
    backgroundColor: 'var(--bg-footer)',
  },
};
