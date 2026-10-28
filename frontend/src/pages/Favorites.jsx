import { useNavigate } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import { MovieCard } from '../components/movies/MovieCard';
import { EmptyState } from '../components/common/EmptyState';
import { IconHeart } from '../components/common/Icons';

export const Favorites = () => {
  const navigate = useNavigate();
  const { getFavoriteMovies, favoriteCount } = useFavorites();
  const movies = getFavoriteMovies();

  return (
    <div className="container-fluid px-3 px-lg-5 py-5">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <span className="badge bg-danger rounded-pill px-3 py-1 mb-2">Saved Watchlist</span>
          <h2 className="fw-extrabold text-white mb-1">Your Favorite Movies</h2>
          <p className="text-white-50 small mb-0">
            Keep track of the films you love or want to watch next.
          </p>
        </div>

        <span className="badge bg-dark border border-secondary text-white px-3 py-2">
          {favoriteCount} {favoriteCount === 1 ? 'Movie' : 'Movies'} Saved
        </span>
      </div>

      {movies.length === 0 ? (
        <EmptyState
          icon={IconHeart}
          title="No favorite movies saved yet"
          message="Tap the heart icon on any movie poster to add it to your personal watchlist for quick access."
          actionLabel="Explore Movies Now"
          onAction={() => navigate('/movies')}
        />
      ) : (
        <div className="row g-4">
          {movies.map((movie) => (
            <div key={movie.id || movie._id} className="col-12 col-sm-6 col-md-4 col-lg-3">
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
