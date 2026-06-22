import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import './App.css';

// Lazy loading components for faster initial load
const Landing = lazy(() => import('./pages/Landing'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Auth = lazy(() => import('./pages/Auth'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const PostProduct = lazy(() => import('./pages/PostProduct'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Chat = lazy(() => import('./pages/Chat'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// Scroll to top helper
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

// Fallback spinner for page loads
function PageLoader() {
  return (
    <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTop: '3px solid var(--gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

// Guarded Route — must be logged in
function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/auth" replace />;
}

// Guarded Route — admins only
function AdminRoute({ children }) {
  const { user } = useAuth();
  return user && user.isAdmin ? children : <Navigate to="/" replace />;
}

function AppContent() {
  return (
    <Router>
      <ScrollToTop />
      <div style={styles.app}>
        <Navbar />
        <div style={styles.main}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/"            element={<Landing />} />
              <Route path="/marketplace" element={
                <PrivateRoute><Marketplace /></PrivateRoute>
              } />
              <Route path="/auth"        element={<Auth />} />
              <Route path="/product/:id" element={
                <PrivateRoute><ProductDetails /></PrivateRoute>
              } />

              {/* Private student features */}
              <Route path="/post" element={
                <PrivateRoute><PostProduct /></PrivateRoute>
              } />
              <Route path="/edit/:id" element={
                <PrivateRoute><PostProduct /></PrivateRoute>
              } />
              <Route path="/profile" element={
                <PrivateRoute><Dashboard /></PrivateRoute>
              } />
              <Route path="/chat" element={
                <PrivateRoute><Chat /></PrivateRoute>
              } />

              {/* Admin control portal */}
              <Route path="/admin" element={
                <AdminRoute><AdminDashboard /></AdminRoute>
              } />

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
