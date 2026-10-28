import api from './api';
import { USE_MOCKS } from '../utils/env';

export const paymentService = {
  // Create payment order with real bookingId
  createPaymentOrder: async (bookingId) => {
    if (!USE_MOCKS) {
      const res = await api.post('/payments/create-order', { bookingId });
      const data = res.data?.data || res.data;
      if (data?.orderId) {
        return {
          success: true,
          orderId: data.orderId,
          amount: data.amount,
          currency: data.currency || 'USD',
          bookingId: data.bookingId,
          isLive: data.isLive
        };
      }
      throw new Error('Payment order creation failed on server');
    }

    return {
      success: true,
      orderId: `DEMO-PAY-${Date.now()}`,
      amount: 0,
      currency: 'USD',
      bookingId,
      isLive: false,
      message: 'Demo payment simulated. No financial charge was made.'
    };
  },

  // Alias for backward compatibility if initiatePayment was called
  initiatePayment: async (paymentDetails) => {
    const bookingId = paymentDetails?.bookingId;
    return paymentService.createPaymentOrder(bookingId);
  },

  // Verify payment status
  verifyPayment: async (orderId, paymentResponse = {}) => {
    if (!USE_MOCKS) {
      const res = await api.post('/payments/verify', {
        orderId,
        paymentResponse
      });
      const data = res.data?.data || res.data;
      if (data?.verified) {
        return {
          verified: true,
          booking: data.booking,
          isLive: data.isLive,
          status: data.status
        };
      }
      throw new Error('Payment verification failed');
    }

    return {
      verified: true,
      booking: null,
      isLive: false,
      status: 'confirmed_demo'
    };
  }
};
