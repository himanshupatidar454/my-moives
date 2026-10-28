import api from './api';
import { mockReviews } from '../data/mockReviews';
import { USE_MOCKS } from '../utils/env';

const REVIEWS_LOCAL_KEY = 'imovies_reviews_cache';

const getStoredReviews = () => {
  try {
    const cached = localStorage.getItem(REVIEWS_LOCAL_KEY);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.error('Failed reading reviews from storage', err);
  }
  localStorage.setItem(REVIEWS_LOCAL_KEY, JSON.stringify(mockReviews));
  return mockReviews;
};

export const reviewService = {
  // Get reviews for a specific movie
  getReviewsByMovie: async (movieId, params = {}) => {
    if (!USE_MOCKS) {
      const res = await api.get(`/movies/${movieId}/reviews`, { params });
      const reviews = res.data?.reviews || res.data?.data?.reviews || [];
      const total = res.data?.total ?? res.data?.data?.total ?? reviews.length;
      return { reviews, total, isDemo: false };
    }

    const all = getStoredReviews();
    const movieReviews = all.filter((r) => r.movieId === movieId);
    return { reviews: movieReviews, total: movieReviews.length, isDemo: true };
  },

  // Admin: Get all reviews for moderation
  getAllReviewsAdmin: async (params = {}) => {
    if (!USE_MOCKS) {
      const res = await api.get('/admin/reviews', { params });
      const reviews = res.data?.reviews || res.data?.data?.reviews || [];
      const total = res.data?.total ?? res.data?.data?.total ?? reviews.length;
      return { reviews, total, isDemo: false };
    }

    const all = getStoredReviews();
    return { reviews: all, total: all.length, isDemo: true };
  },

  // Submit review
  submitReview: async (reviewData) => {
    const text = reviewData.reviewText || reviewData.comment || reviewData.content || '';
    const payload = {
      rating: Number(reviewData.rating),
      reviewText: text,
      comment: text
    };

    if (!USE_MOCKS) {
      const res = await api.post(`/movies/${reviewData.movieId}/reviews`, payload);
      const review = res.data?.review || res.data?.data?.review;
      return {
        success: true,
        review,
        message: res.data?.message || 'Review submitted successfully',
        isDemo: false
      };
    }

    const all = getStoredReviews();
    const newRev = {
      id: `rev-${Date.now().toString().slice(-4)}`,
      movieId: reviewData.movieId,
      rating: reviewData.rating,
      content: text,
      comment: text,
      author: reviewData.author || 'Cinema Enthusiast',
      avatar: reviewData.avatar,
      date: new Date().toISOString().split('T')[0],
      likes: 0,
      verifiedPurchase: true
    };
    const updated = [newRev, ...all];
    localStorage.setItem(REVIEWS_LOCAL_KEY, JSON.stringify(updated));
    return { success: true, review: newRev, isDemo: true };
  },

  // Delete review
  deleteReview: async (reviewId) => {
    if (!USE_MOCKS) {
      const res = await api.delete(`/admin/reviews/${reviewId}`);
      return {
        success: true,
        message: res.data?.message || 'Review deleted successfully',
        isDemo: false
      };
    }

    const all = getStoredReviews();
    const filtered = all.filter((r) => r.id !== reviewId);
    localStorage.setItem(REVIEWS_LOCAL_KEY, JSON.stringify(filtered));
    return { success: true, isDemo: true };
  }
};
