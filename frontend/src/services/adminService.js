import api from './api';
import { mockUsers } from '../data/mockUsers';
import { USE_MOCKS } from '../utils/env';

const USERS_LOCAL_KEY = 'imovies_users_cache';

const getStoredUsers = () => {
  try {
    const cached = localStorage.getItem(USERS_LOCAL_KEY);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.error('Failed reading users from storage', err);
  }
  localStorage.setItem(USERS_LOCAL_KEY, JSON.stringify(mockUsers));
  return mockUsers;
};

export const adminService = {
  // Summary dashboard analytics
  getDashboardStats: async () => {
    if (!USE_MOCKS) {
      const res = await api.get('/admin/stats');
      const stats = res.data?.stats || res.data?.data?.stats;
      const trends = res.data?.trends || res.data?.data?.trends || [];
      return { stats, trends, isDemo: false };
    }

    return {
      stats: {
        totalMovies: 10,
        totalTheatres: 6,
        upcomingShows: 48,
        totalBookings: 184,
        totalRevenue: 28450.00,
        registeredUsers: 1420
      },
      trends: [
        { month: 'May', bookings: 98, revenue: 14200 },
        { month: 'Jun', bookings: 145, revenue: 21900 },
        { month: 'Jul', bookings: 198, revenue: 29800 },
        { month: 'Aug', bookings: 172, revenue: 26400 },
        { month: 'Sep', bookings: 154, revenue: 23100 },
        { month: 'Oct', bookings: 184, revenue: 28450 }
      ],
      isDemo: true
    };
  },

  // Full reports breakdown
  getReports: async () => {
    if (!USE_MOCKS) {
      const res = await api.get('/admin/reports');
      const data = res.data?.data || res.data;
      return {
        topMovies: data?.topMovies || [],
        theatreBreakdown: data?.theatreBreakdown || [],
        generatedAt: data?.generatedAt || new Date().toISOString(),
        isDemo: false
      };
    }

    return {
      topMovies: [],
      theatreBreakdown: [],
      generatedAt: new Date().toISOString(),
      isDemo: true
    };
  },

  // Get users list
  getUsers: async (params = {}) => {
    if (!USE_MOCKS) {
      const res = await api.get('/admin/users', { params });
      const users = res.data?.users || res.data?.data?.users || [];
      const total = res.data?.total ?? res.data?.data?.total ?? users.length;
      return { users, total, isDemo: false };
    }

    return { users: getStoredUsers(), total: getStoredUsers().length, isDemo: true };
  },

  // Toggle user status
  toggleUserStatus: async (userId, nextStatus) => {
    if (!USE_MOCKS) {
      const res = await api.patch(`/admin/users/${userId}/status`, nextStatus ? { status: nextStatus } : {});
      const user = res.data?.user || res.data?.data?.user;
      return { success: true, user, isDemo: false };
    }

    const current = getStoredUsers();
    const idx = current.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      current[idx].status = nextStatus || (current[idx].status === 'active' ? 'inactive' : 'active');
      localStorage.setItem(USERS_LOCAL_KEY, JSON.stringify(current));
      return { success: true, user: current[idx], isDemo: true };
    }
    return { success: false, message: 'User not found' };
  },

  // Export report to CSV/JSON
  exportReport: (format = 'json', data = {}) => {
    const filename = `imovies-report-${Date.now()}.${format}`;
    const content = format === 'json'
      ? JSON.stringify(data, null, 2)
      : [
          ['Metric', 'Value'],
          ['Total Movies', data?.summary?.totalMovies || '10'],
          ['Total Theatres', data?.summary?.totalTheatres || '6'],
          ['Total Bookings', data?.summary?.totalBookings || '184'],
          ['Total Revenue ($)', data?.summary?.totalRevenue || '28450.00'],
          ['Generated At', new Date().toISOString()]
        ].map((e) => e.join(',')).join('\n');

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true, filename };
  }
};
