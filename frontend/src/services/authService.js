import api from './api';
import { mockUsers } from '../data/mockUsers';
import { USE_MOCKS } from '../utils/env';

const AUTH_STORAGE_KEY = 'imovies_user_session';
const TOKEN_STORAGE_KEY = 'imovies_token';

export const authService = {
  // Login with credentials
  login: async (email, password) => {
    if (!USE_MOCKS) {
      // Normal mode: Strictly use real Express API
      const res = await api.post('/auth/login', { email, password });
      const user = res.data?.user || res.data?.data?.user;
      const token = res.data?.token || res.data?.data?.token;
      if (user && token) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        return {
          success: true,
          user,
          token,
          isDemo: false,
          message: res.data?.message || `Welcome back, ${user.name}!`
        };
      }
      throw new Error('Invalid login response structure from server');
    }

    // Explicit Isolated Demo Mode only
    const foundUser = mockUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase().trim()
    );

    if (foundUser) {
      const demoToken = `demo-jwt-${foundUser.role}-${Date.now()}`;
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(foundUser));
      localStorage.setItem(TOKEN_STORAGE_KEY, demoToken);
      return {
        success: true,
        user: foundUser,
        token: demoToken,
        isDemo: true,
        message: `Welcome, ${foundUser.name}! (Demo Mode: ${foundUser.role})`
      };
    }

    throw new Error('Demo user not found. Available demo emails: alex@imovies.com, admin@imovies.com');
  },

  // Register new account
  register: async (userData) => {
    if (!USE_MOCKS) {
      // Normal mode: Strictly create user in real MongoDB
      const res = await api.post('/auth/register', userData);
      const user = res.data?.user || res.data?.data?.user;
      const token = res.data?.token || res.data?.data?.token;
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
        return {
          success: true,
          user,
          token,
          isDemo: false,
          message: res.data?.message || 'Account created successfully! Welcome to IMovies.'
        };
      }
      throw new Error('Registration failed on server');
    }

    // Explicit Isolated Demo Mode only
    const newUser = {
      id: `usr-${Date.now().toString().slice(-4)}`,
      name: userData.name || userData.fullName,
      email: userData.email,
      phone: userData.phone || '+1 (555) 123-4567',
      role: 'user',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      memberSince: 'Today',
      status: 'active'
    };

    const demoToken = `demo-jwt-user-${Date.now()}`;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    localStorage.setItem(TOKEN_STORAGE_KEY, demoToken);

    return {
      success: true,
      user: newUser,
      token: demoToken,
      isDemo: true,
      message: 'Demo account created successfully.'
    };
  },

  // Validate session against /auth/me
  getMe: async () => {
    const res = await api.get('/auth/me');
    const user = res.data?.user || res.data?.data?.user;
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    }
    return { user };
  },

  // Get current logged in user from localStorage
  getCurrentUser: () => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },

  // Update profile
  updateProfile: async (updatedData) => {
    if (!USE_MOCKS) {
      const res = await api.put('/users/profile', updatedData);
      const user = res.data?.user || res.data?.data?.user;
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        return { success: true, user, isDemo: false };
      }
      throw new Error('Failed to update profile');
    }

    // Explicit demo update
    const current = authService.getCurrentUser() || {};
    const updated = { ...current, ...updatedData };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
    return { success: true, user: updated, isDemo: true };
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    if (!USE_MOCKS) {
      const res = await api.patch('/users/me/password', { currentPassword, newPassword });
      return {
        success: true,
        message: res.data?.message || 'Password changed successfully'
      };
    }
    return { success: true, message: 'Password updated (demo mode)' };
  },

  // Logout
  logout: () => {
    // Optionally notify backend
    api.post('/auth/logout').catch(() => {});
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};
