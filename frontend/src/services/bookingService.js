import api from './api';
import { mockBookings } from '../data/mockBookings';
import { USE_MOCKS } from '../utils/env';

const BOOKINGS_LOCAL_KEY = 'imovies_bookings_cache';

const getStoredBookings = () => {
  try {
    const cached = localStorage.getItem(BOOKINGS_LOCAL_KEY);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.error('Failed reading bookings from storage', err);
  }
  localStorage.setItem(BOOKINGS_LOCAL_KEY, JSON.stringify(mockBookings));
  return mockBookings;
};

export const bookingService = {
  // Create booking (initiates booking verification and seats hold)
  createBooking: async (bookingPayload) => {
    if (!USE_MOCKS) {
      const res = await api.post('/bookings', bookingPayload);
      const booking = res.data?.booking || res.data?.data?.booking;
      if (booking) {
        return { success: true, booking, isDemo: false };
      }
      throw new Error('Booking could not be created');
    }

    const current = getStoredBookings();
    const newRef = `IMV-${Math.floor(10000 + Math.random() * 90000)}`;
    const newBooking = {
      ...bookingPayload,
      id: newRef,
      status: 'confirmed',
      paymentStatus: 'paid (demo mode)',
      createdAt: new Date().toISOString(),
      qrCodeData: `IMOVIES-DEMO-TICKET-${newRef}-${Date.now()}`,
      isDemoBooking: true
    };

    const updated = [newBooking, ...current];
    localStorage.setItem(BOOKINGS_LOCAL_KEY, JSON.stringify(updated));
    return { success: true, booking: newBooking, isDemo: true };
  },

  // Verify coupon code server-side
  verifyCoupon: async (couponCode, subtotal) => {
    if (!USE_MOCKS) {
      const res = await api.post('/bookings/verify-coupon', { couponCode, subtotal });
      return res.data?.data || res.data;
    }

    // Demo coupon calculations
    const code = String(couponCode).trim().toUpperCase();
    if (code === 'IMOVIES5' || code === 'SAVE5') {
      return { valid: true, couponCode: code, discount: Math.min(5.0, subtotal), message: '$5 discount applied' };
    }
    if (code === 'PREMIERE10' || code === 'WELCOME10') {
      return { valid: true, couponCode: code, discount: Math.round(subtotal * 0.1 * 100) / 100, message: '10% discount applied' };
    }
    if (code === 'IMOVIES20' || code === 'VIP20') {
      return { valid: true, couponCode: code, discount: Math.round(subtotal * 0.2 * 100) / 100, message: '20% discount applied' };
    }
    throw new Error(`Invalid coupon code: '${couponCode}'`);
  },

  // Get user bookings
  getUserBookings: async (userId = null) => {
    if (!USE_MOCKS) {
      const res = await api.get('/bookings/my-bookings');
      const bookings = res.data?.bookings || res.data?.data?.bookings || [];
      return { bookings, isDemo: false };
    }

    const all = getStoredBookings();
    const userBookings = userId ? all.filter((b) => b.userId === userId || b.userId === 'usr-001') : all;
    return { bookings: userBookings, isDemo: true };
  },

  // Get booking by ID
  getBookingById: async (bookingId) => {
    if (!USE_MOCKS) {
      const res = await api.get(`/bookings/${bookingId}`);
      const booking = res.data?.booking || res.data?.data?.booking;
      if (booking) {
        return { booking, isDemo: false };
      }
      throw new Error('Booking not found');
    }

    const all = getStoredBookings();
    const found = all.find((b) => b.id === bookingId || b._id === bookingId);
    if (!found) throw new Error('Booking not found');
    return { booking: found, isDemo: true };
  },

  // Cancel booking
  cancelBooking: async (bookingId, reason = 'Cancelled by customer') => {
    if (!USE_MOCKS) {
      const res = await api.post(`/bookings/${bookingId}/cancel`, { reason });
      const booking = res.data?.booking || res.data?.data?.booking;
      return {
        success: true,
        message: res.data?.message || 'Booking cancelled successfully',
        booking,
        isDemo: false
      };
    }

    const all = getStoredBookings();
    const idx = all.findIndex((b) => b.id === bookingId || b._id === bookingId);
    if (idx !== -1) {
      all[idx].status = 'cancelled';
      all[idx].paymentStatus = 'refunded (demo)';
      all[idx].cancellationReason = reason;
      localStorage.setItem(BOOKINGS_LOCAL_KEY, JSON.stringify(all));
      return { success: true, isDemo: true, booking: all[idx] };
    }
    return { success: false, message: 'Booking reference not found' };
  },

  // Admin: Get all bookings
  getAllBookingsAdmin: async (params = {}) => {
    if (!USE_MOCKS) {
      const res = await api.get('/admin/bookings', { params });
      const bookings = res.data?.bookings || res.data?.data?.bookings || [];
      const total = res.data?.total ?? res.data?.data?.total ?? bookings.length;
      return { bookings, total, isDemo: false };
    }

    return { bookings: getStoredBookings(), total: getStoredBookings().length, isDemo: true };
  }
};
