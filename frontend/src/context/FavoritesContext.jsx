import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);
const FAVORITES_STORAGE_KEY = 'imovies_favorites';

export const FavoritesProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [favoriteMovies, setFavoriteMovies] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync favorites with the real backend when authenticated
  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/favorites');
      const list = res.data?.favorites || res.data?.data?.favorites || [];
      setFavoriteMovies(list);
      const ids = list.map((m) => m.id || m._id);
      setFavoriteIds(ids);
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
    } catch (err) {
      console.warn('[Favorites] Could not sync with backend:', err.message);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    } else {
      // Guest: Read IDs from local storage
      try {
        const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
        setFavoriteIds(saved ? JSON.parse(saved) : []);
      } catch {
        setFavoriteIds([]);
      }
    }
  }, [isAuthenticated, fetchFavorites]);

  const isFavorite = (movieId) => {
    if (!movieId) return false;
    return favoriteIds.some((id) => String(id) === String(movieId));
  };

  const toggleFavorite = async (movie) => {
    const movieId = movie?.id || movie?._id;
    if (!movieId) return;

    const currentlyFavorite = isFavorite(movieId);

    if (currentlyFavorite) {
      // Optimistic update
      setFavoriteIds((prev) => prev.filter((id) => String(id) !== String(movieId)));
      setFavoriteMovies((prev) => prev.filter((m) => String(m.id || m._id) !== String(movieId)));

      if (isAuthenticated) {
        try {
          await api.delete(`/favorites/${movieId}`);
          toast.info(`Removed "${movie.title}" from your favorites`);
        } catch (err) {
          console.error('[Favorites Error] Failed removing favorite', err);
          fetchFavorites();
        }
      } else {
        toast.info(`Removed "${movie.title}" from your favorites`);
      }
    } else {
      // Optimistic update
      setFavoriteIds((prev) => [...prev, movieId]);
      setFavoriteMovies((prev) => [...prev, movie]);

      if (isAuthenticated) {
        try {
          await api.post(`/favorites/${movieId}`);
          toast.success(`Added "${movie.title}" to your favorites!`);
        } catch (err) {
          console.error('[Favorites Error] Failed adding favorite', err);
          fetchFavorites();
        }
      } else {
        toast.success(`Added "${movie.title}" to your favorites!`);
      }
    }
  };

  const getFavoriteMovies = () => {
    return favoriteMovies;
  };

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        isFavorite,
        toggleFavorite,
        getFavoriteMovies,
        favoriteCount: favoriteIds.length,
        refreshFavorites: fetchFavorites
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within a FavoritesProvider');
  return ctx;
};
