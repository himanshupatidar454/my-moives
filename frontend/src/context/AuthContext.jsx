import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { USE_MOCKS } from '../utils/env';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(USE_MOCKS);

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      const token = localStorage.getItem('imovies_token');

      if (token) {
        if (!USE_MOCKS) {
          try {
            const res = await authService.getMe();
            if (res?.user) {
              setUser(res.user);
              setIsDemoMode(false);
            } else {
              authService.logout();
              setUser(null);
            }
          } catch (err) {
            console.warn('[Auth] Session restoration failed, clearing stale credentials:', err.message);
            authService.logout();
            setUser(null);
          }
        } else {
          const saved = authService.getCurrentUser();
          if (saved) {
            setUser(saved);
            setIsDemoMode(true);
          }
        }
      } else {
        if (USE_MOCKS) {
          const saved = authService.getCurrentUser();
          if (saved) {
            setUser(saved);
            setIsDemoMode(true);
          }
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await authService.login(email, password);
      if (res.success) {
        setUser(res.user);
        setIsDemoMode(Boolean(res.isDemo));
        toast.success(res.message || 'Logged in successfully!');
        return { success: true, user: res.user };
      }
      return { success: false };
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        (err.response?.data?.errors && err.response.data.errors[0]?.message) ||
        (err.response?.data?.errors && err.response.data.errors[0]?.msg) ||
        err.message ||
        'Login failed. Please check your credentials.';
      console.error('[Auth Login Failed]', err.response?.status || 'Network Error', errorMsg);
      toast.error(errorMsg);
      return { success: false, error: err };
    }
  };

  const register = async (userData) => {
    try {
      const res = await authService.register(userData);
      if (res.success) {
        setUser(res.user);
        setIsDemoMode(Boolean(res.isDemo));
        toast.success(res.message || 'Registration successful!');
        return { success: true, user: res.user };
      }
      return { success: false };
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        (err.response?.data?.errors && err.response.data.errors[0]?.message) ||
        (err.response?.data?.errors && err.response.data.errors[0]?.msg) ||
        err.message ||
        'Registration failed.';
      console.error('[Auth Register Failed]', err.response?.status || 'Network Error', errorMsg);
      toast.error(errorMsg);
      return { success: false, error: err };
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    toast.info('You have been logged out.');
  };

  const updateProfile = async (data) => {
    try {
      const res = await authService.updateProfile(data);
      if (res.success) {
        setUser(res.user);
        toast.success('Profile updated successfully!');
        return { success: true, user: res.user };
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        (err.response?.data?.errors && err.response.data.errors[0]?.message) ||
        err.message ||
        'Failed to update profile.';
      toast.error(errorMsg);
      return { success: false, error: err };
    }
    return { success: false };
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const res = await authService.changePassword(currentPassword, newPassword);
      if (res.success) {
        toast.success(res.message || 'Password changed successfully!');
        return { success: true };
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        (err.response?.data?.errors && err.response.data.errors[0]?.message) ||
        err.message ||
        'Failed to change password.';
      toast.error(errorMsg);
      return { success: false, error: err };
    }
    return { success: false };
  };

  // Quick switch role utility - only enabled when explicit USE_MOCKS is true
  const switchDemoRole = (targetRole) => {
    if (!USE_MOCKS) return;
    if (targetRole === 'admin') {
      const adminUser = {
        id: "adm-001",
        name: "Sarah Cinema Manager",
        email: "admin@imovies.com",
        role: "admin",
        phone: "+1 (555) 901-4422",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
        memberSince: "August 2023",
        status: "active"
      };
      setUser(adminUser);
      localStorage.setItem('imovies_user_session', JSON.stringify(adminUser));
      toast.info('Switched to Demo Administrator role');
    } else {
      const regularUser = {
        id: "usr-001",
        name: "Alex Morgan",
        email: "alex@imovies.com",
        role: "user",
        phone: "+1 (555) 349-2819",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
        memberSince: "January 2024",
        status: "active"
      };
      setUser(regularUser);
      localStorage.setItem('imovies_user_session', JSON.stringify(regularUser));
      toast.info('Switched to Demo Customer role');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'guest',
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isDemoMode,
        useMocks: USE_MOCKS,
        loading,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        switchDemoRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
