import api from './api';
import { mockShowsList, generateSeatLayout } from '../data/mockShows';
import { mockTheatres } from '../data/mockTheatres';
import { USE_MOCKS } from '../utils/env';

const SHOWS_LOCAL_KEY = 'imovies_shows_cache';

const getStoredShows = () => {
  try {
    const cached = localStorage.getItem(SHOWS_LOCAL_KEY);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.error('Failed reading shows from storage', err);
  }
  localStorage.setItem(SHOWS_LOCAL_KEY, JSON.stringify(mockShowsList));
  return mockShowsList;
};

export const showService = {
  // Get shows grouped by theatre for a movie, city, and date
  getShowsGroupedByTheatre: async (movieId, city = null, date = null) => {
    if (!USE_MOCKS) {
      const res = await api.get('/shows', {
        params: {
          movieId,
          city: city && city !== 'All' ? city : undefined,
          date: date || undefined
        }
      });
      const theatreShows = res.data?.theatreShows || res.data?.data?.theatreShows || [];
      const shows = res.data?.shows || res.data?.data?.shows || [];
      return { theatreShows, shows, isDemo: false };
    }

    const allShows = getStoredShows();
    const matchingShows = allShows.filter((s) => s.movieId === movieId);

    const grouped = [];
    const relevantTheatres = city && city !== 'All'
      ? mockTheatres.filter((t) => t.city.toLowerCase() === city.toLowerCase())
      : mockTheatres;

    for (const theatre of relevantTheatres) {
      const showsForTheatre = matchingShows.filter((s) => s.theatreId === theatre.id);
      if (showsForTheatre.length > 0) {
        grouped.push({
          theatre,
          shows: showsForTheatre
        });
      }
    }

    return { theatreShows: grouped, isDemo: true };
  },

  // Get single show by ID
  getShowById: async (showId) => {
    if (!USE_MOCKS) {
      const res = await api.get(`/shows/${showId}`);
      const show = res.data?.show || res.data?.data?.show;
      const pricing = res.data?.pricing || res.data?.data?.pricing || show?.pricing;
      const ticketFee = res.data?.ticketFee ?? res.data?.data?.ticketFee ?? show?.ticketFee ?? 1.50;
      const maxSeatsPerBooking = res.data?.maxSeatsPerBooking ?? res.data?.data?.maxSeatsPerBooking ?? show?.maxSeatsPerBooking ?? 10;
      if (show) return { show, pricing, ticketFee, maxSeatsPerBooking, isDemo: false };
      throw new Error('Show not found');
    }

    const allShows = getStoredShows();
    let found = allShows.find((s) => s.id === showId);
    if (!found) throw new Error('Show not found');

    return {
      show: found,
      pricing: {
        standardPrice: found.standardPrice,
        premiumPrice: found.premiumPrice,
        vipPrice: found.vipPrice || 28.00,
        ticketFee: found.ticketFee || 1.50,
        maxSeatsPerBooking: found.maxSeatsPerBooking || 10
      },
      ticketFee: found.ticketFee || 1.50,
      maxSeatsPerBooking: found.maxSeatsPerBooking || 10,
      isDemo: true
    };
  },

  // Get seat map for a show
  getSeatLayoutForShow: async (showId) => {
    if (!USE_MOCKS) {
      const res = await api.get(`/shows/${showId}/seats`);
      const seatLayout = res.data?.seatLayout || res.data?.data?.seatLayout;
      const pricing = res.data?.pricing || res.data?.data?.pricing;
      const ticketFee = res.data?.ticketFee ?? res.data?.data?.ticketFee ?? 1.50;
      const maxSeatsPerBooking = res.data?.maxSeatsPerBooking ?? res.data?.data?.maxSeatsPerBooking ?? 10;
      if (seatLayout) {
        return { seatLayout, pricing, ticketFee, maxSeatsPerBooking, isDemo: false };
      }
      throw new Error('Seat layout could not be retrieved');
    }

    const layout = generateSeatLayout(showId);
    return {
      seatLayout: layout,
      pricing: {
        standardPrice: 14.50,
        premiumPrice: 21.00,
        vipPrice: 28.00,
        ticketFee: 1.50,
        maxSeatsPerBooking: 10
      },
      ticketFee: 1.50,
      maxSeatsPerBooking: 10,
      isDemo: true
    };
  },

  // Admin: Get all shows flat list
  getAllShows: async () => {
    if (!USE_MOCKS) {
      const res = await api.get('/shows');
      const shows = res.data?.shows || res.data?.data?.shows || [];
      return { shows, isDemo: false };
    }

    return { shows: getStoredShows(), isDemo: true };
  },

  // Admin: Create show
  createShow: async (showData) => {
    if (!USE_MOCKS) {
      const res = await api.post('/shows', showData);
      const show = res.data?.show || res.data?.data?.show;
      if (show) return { success: true, show, isDemo: false };
      throw new Error('Failed to create show');
    }

    const current = getStoredShows();
    const newShow = {
      ...showData,
      id: `show-${Date.now().toString().slice(-4)}`,
      status: 'available'
    };
    const updated = [newShow, ...current];
    localStorage.setItem(SHOWS_LOCAL_KEY, JSON.stringify(updated));
    return { success: true, show: newShow, isDemo: true };
  },

  // Admin: Delete show
  deleteShow: async (id) => {
    if (!USE_MOCKS) {
      const res = await api.delete(`/shows/${id}`);
      return { success: true, message: res.data?.message, isDemo: false };
    }

    const current = getStoredShows();
    const filtered = current.filter((s) => s.id !== id);
    localStorage.setItem(SHOWS_LOCAL_KEY, JSON.stringify(filtered));
    return { success: true, isDemo: true };
  }
};
