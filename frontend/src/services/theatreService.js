import api from './api';
import { mockTheatres } from '../data/mockTheatres';
import { USE_MOCKS } from '../utils/env';

const THEATRES_LOCAL_KEY = 'imovies_theatres_cache';

const getStoredTheatres = () => {
  try {
    const cached = localStorage.getItem(THEATRES_LOCAL_KEY);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.error('Failed reading theatres from storage', err);
  }
  localStorage.setItem(THEATRES_LOCAL_KEY, JSON.stringify(mockTheatres));
  return mockTheatres;
};

export const theatreService = {
  // Get all theatres, optionally filtered by city
  getTheatres: async (city = null) => {
    if (!USE_MOCKS) {
      const res = await api.get('/theatres', { params: city && city !== 'All' ? { city } : {} });
      const theatres = res.data?.theatres || res.data?.data?.theatres || [];
      return { theatres, isDemo: false };
    }

    let list = [...getStoredTheatres()];
    if (city && city !== 'All') {
      list = list.filter((t) => t.city.toLowerCase() === city.toLowerCase());
    }
    return { theatres: list, isDemo: true };
  },

  // Get single theatre by ID
  getTheatreById: async (id) => {
    if (!USE_MOCKS) {
      const res = await api.get(`/theatres/${id}`);
      const theatre = res.data?.theatre || res.data?.data?.theatre;
      if (theatre) return { theatre, isDemo: false };
      throw new Error('Theatre not found');
    }

    const list = getStoredTheatres();
    const theatre = list.find((t) => t.id === id);
    return { theatre: theatre || null, isDemo: true };
  },

  // Get screens for a theatre
  getTheatreScreens: async (theatreId) => {
    if (!USE_MOCKS) {
      const res = await api.get(`/theatres/${theatreId}/screens`);
      const screens = res.data?.screens || res.data?.data?.screens || [];
      return { screens, isDemo: false };
    }

    return { screens: [], isDemo: true };
  },

  // Admin: Create theatre
  createTheatre: async (theatreData) => {
    if (!USE_MOCKS) {
      const res = await api.post('/theatres', theatreData);
      const theatre = res.data?.theatre || res.data?.data?.theatre;
      if (theatre) return { success: true, theatre, isDemo: false };
      throw new Error('Failed to create theatre');
    }

    const current = getStoredTheatres();
    const newTheatre = {
      ...theatreData,
      id: `th-${Date.now().toString().slice(-3)}`,
      screensCount: Number(theatreData.screensCount) || 4,
      status: 'active',
      rating: 4.8,
      amenities: Array.isArray(theatreData.amenities) ? theatreData.amenities : ["Dolby Atmos", "Recliners"]
    };
    const updated = [newTheatre, ...current];
    localStorage.setItem(THEATRES_LOCAL_KEY, JSON.stringify(updated));
    return { success: true, theatre: newTheatre, isDemo: true };
  },

  // Admin: Update theatre
  updateTheatre: async (id, updatedFields) => {
    if (!USE_MOCKS) {
      const res = await api.put(`/theatres/${id}`, updatedFields);
      const theatre = res.data?.theatre || res.data?.data?.theatre;
      if (theatre) return { success: true, theatre, isDemo: false };
      throw new Error('Failed to update theatre');
    }

    const current = getStoredTheatres();
    const idx = current.findIndex((t) => t.id === id);
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...updatedFields };
      localStorage.setItem(THEATRES_LOCAL_KEY, JSON.stringify(current));
      return { success: true, theatre: current[idx], isDemo: true };
    }
    return { success: false, message: 'Theatre not found' };
  },

  // Admin: Delete theatre
  deleteTheatre: async (id) => {
    if (!USE_MOCKS) {
      const res = await api.delete(`/theatres/${id}`);
      return { success: true, message: res.data?.message, isDemo: false };
    }

    const current = getStoredTheatres();
    const filtered = current.filter((t) => t.id !== id);
    localStorage.setItem(THEATRES_LOCAL_KEY, JSON.stringify(filtered));
    return { success: true, isDemo: true };
  }
};
