import React, { createContext, useState, useEffect, useContext } from 'react';
import { API_URL } from '../config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('lcu_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [token, setToken] = useState(() => {
    return localStorage.getItem('lcu_token') || null;
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      setUser(data);
      setToken(data.token);
      localStorage.setItem('lcu_user', JSON.stringify(data));
      localStorage.setItem('lcu_token', data.token);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, hostel, faculty, requestVerification) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, hostel, faculty, requestVerification })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('lcu_user');
    localStorage.removeItem('lcu_token');
  };

  const fetchProfile = async () => {
    if (!token) return null;
    try {
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        // Sync user state with fresh DB data
        const updatedUser = { ...user, ...data };
        setUser(updatedUser);
        localStorage.setItem('lcu_user', JSON.stringify(updatedUser));
        return data;
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
    return null;
  };

  const verifyStudent = async (idCardFile) => {
    if (!token) return;
    try {
      const formData = new FormData();
      if (idCardFile) {
        formData.append('idCard', idCardFile);
      }
      const response = await fetch(`${API_URL}/api/auth/verify-student`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (response.ok) {
        const updated = { ...user, isVerifiedStudent: true };
        setUser(updated);
        localStorage.setItem('lcu_user', JSON.stringify(updated));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const verifyOtp = async (email, otp) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed');
      }
      setUser(data);
      setToken(data.token);
      localStorage.setItem('lcu_user', JSON.stringify(data));
      localStorage.setItem('lcu_token', data.token);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async (email) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Resending OTP failed');
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, fetchProfile, verifyStudent, verifyOtp, resendOtp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
