import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Marketplace from './pages/Marketplace';
import Auth from './pages/Auth';
import ProductDetails from './pages/ProductDetails';
import PostProduct from './pages/PostProduct';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

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
      <div style={styles.app}>
        <Navbar />
        <div style={styles.main}>
          <Routes>
            {/* Public routes */}
            <Route path="/"            element={<Landing />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/auth"        element={<Auth />} />
            <Route path="/product/:id" element={<ProductDetails />} />

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
