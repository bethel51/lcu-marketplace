import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import OfflineOverlay from './components/OfflineOverlay';
import { CartProvider } from './context/CartContext';
import './App.css';

// ── Lazy-load all pages (code-split per route) ─────────────────
const Landing        = lazy(() => import('./pages/Landing'));
const Marketplace    = lazy(() => import('./pages/Marketplace'));
const Auth           = lazy(() => import('./pages/Auth'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const PostProduct    = lazy(() => import('./pages/PostProduct'));
const Withdraw       = lazy(() => import('./pages/Withdraw'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminLogin     = lazy(() => import('./pages/AdminLogin'));
const BuyerDashboard = lazy(() => import('./pages/BuyerDashboard'));
const Checkout       = lazy(() => import('./pages/Checkout'));
const ProDashboard   = lazy(() => import('./pages/ProDashboard'));
const ProStorefront  = lazy(() => import('./pages/ProStorefront'));
const Bag            = lazy(() => import('./pages/Bag'));

// ── Eagerly import Dashboard (Seller dashboard — most visited by logged-in sellers) ──
import Dashboard from './pages/Dashboard';

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

// Restrict access to Sellers only
function SellerRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role === 'Buyer') return <Navigate to="/profile" replace />;
  return children;
}

// Restrict access to Buyers only
function BuyerRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== 'Buyer') return <Navigate to="/profile" replace />;
  return children;
}

// ── Route guards ───────────────────────────────────────────────
function AdminRoute({ children }) {
  const { user } = useAuth();
  return user && user.isAdmin ? children : <Navigate to="/admin-login" replace />;
}

// ── Route guards ───────────────────────────────────────────────
// Locks /pro-dashboard to active PRO sellers only.
// Non-PRO sellers are sent back to /profile (standard dashboard).
function ProRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role === 'Buyer') return <Navigate to="/profile" replace />;
  if (!user.isPro) return <Navigate to="/profile" replace />;
  return children;
}

// ── Role-based dashboard ─────────────────────────────────────────
// /profile always checks isPro and hard-redirects to the right dashboard.
// This means PRO sellers can never accidentally land on the standard UI.
function RoleBasedDashboard() {
  const { user } = useAuth();
  if (user?.role === 'Buyer') return <BuyerDashboard />;
  // PRO sellers are redirected to the dedicated PRO route (clean URL separation)
  if (user?.isPro) return <Navigate to="/pro-dashboard" replace />;
  return <Dashboard />;
}

// ── SplashScreen Component ──────────────────────────────────────
function SplashScreen({ fadeOut }) {
  return (
    <div className={`splash-screen-container${fadeOut ? ' splash-fade-out' : ''}`}>
      <div className="splash-content splash-logo-animate">
        <img src="/logo.png?v=2" alt="LCU Logo" className="splash-logo" />
        <h1 className="splash-title">Lead City Marketplace</h1>
        <p className="splash-subtitle">LCU Errands & Student Hub</p>
        <div className="splash-loader">
          <div className="splash-spinner splash-spinner-animate" />
        </div>
      </div>
    </div>
  );
}

// ── Startup Routing Redirection ──────────────────────────────────
function RootRedirect() {
  const { user } = useAuth();
  
  if (user) {
    return <Navigate to="/marketplace" replace />;
  }
  
  const hasAccount = localStorage.getItem('lcu_has_account');
  if (hasAccount === 'true') {
    return <Navigate to="/auth?mode=login" replace />;
  } else {
    return <Navigate to="/auth?mode=register" replace />;
  }
}

// ── Main App Shell ─────────────────────────────────────────────
function AppContent() {
  const { user, initializing } = useAuth();
  const [showSplash, setShowSplash] = React.useState(true);
  const [fadeOut, setFadeOut] = React.useState(false);

  // Dismiss the pre-React HTML shell on first mount
  useEffect(() => {
    dismissShell();
  }, []);

  useEffect(() => {
    if (!initializing) {
      setFadeOut(true);
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 500); // matches the css fadeOut animation duration
      return () => clearTimeout(timer);
    }
  }, [initializing]);

  return (
    <>
      {showSplash && <SplashScreen fadeOut={fadeOut} />}
      {!initializing && (
        <Router>
          <OfflineOverlay />
          <TopProgressBar />
          <ScrollToTop />
          <div style={styles.app}>
            <Navbar />
            {/* Main content — extra bottom padding on mobile to clear bottom tab bar */}
            <div style={styles.main} className={user && !user.isAdmin ? 'has-bottom-nav' : ''}>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public */}
                  <Route path="/"            element={<RootRedirect />} />
                  <Route path="/auth"        element={<Auth />} />
                  <Route path="/admin-login" element={<AdminLogin />} />

                  {/* Protected student routes */}
                  <Route path="/marketplace" element={<PrivateRoute><Marketplace /></PrivateRoute>} />
                  <Route path="/product/:id" element={<PrivateRoute><ProductDetails /></PrivateRoute>} />
                  <Route path="/post"        element={<PrivateRoute><SellerRoute><PostProduct /></SellerRoute></PrivateRoute>} />
                  <Route path="/edit/:id"    element={<PrivateRoute><SellerRoute><PostProduct /></SellerRoute></PrivateRoute>} />
                  <Route path="/profile"     element={<PrivateRoute><RoleBasedDashboard /></PrivateRoute>} />
                  <Route path="/bag"         element={<PrivateRoute><Bag /></PrivateRoute>} />
                  {/* /pro-dashboard is strictly for active PRO sellers — ProRoute enforces this */}
                  <Route path="/pro-dashboard" element={<ProRoute><ProDashboard /></ProRoute>} />
                  <Route path="/store/:userId" element={<PrivateRoute><ProStorefront /></PrivateRoute>} />
                  <Route path="/withdraw"    element={<PrivateRoute><SellerRoute><Withdraw /></SellerRoute></PrivateRoute>} />
                  <Route path="/checkout/:orderId" element={<PrivateRoute><Checkout /></PrivateRoute>} />

                  {/* Admin */}
                  <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </div>
            {/* Footer — hidden on mobile when bottom nav is present */}
            <footer style={styles.footer} className={user && !user.isAdmin ? 'footer-desktop-only' : ''}>
              <p>© {new Date().getFullYear()} Lead City University Student Marketplace Hub. All rights reserved.</p>
            </footer>
          </div>
        </Router>
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </CartProvider>
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
