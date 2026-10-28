import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFavorites } from '../../context/FavoritesContext';
import { IconStar, IconHeart, IconTicket, IconClock } from '../common/Icons';

export const MovieCard = ({ movie }) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const navigate = useNavigate();

  if (!movie) return null;

  const favorited = isFavorite(movie.id || movie._id);
  const isComingSoon = movie.status === 'coming_soon' || movie.status === 'coming-soon';

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(movie);
  };

  const handleBookClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isComingSoon) {
      navigate(`/movies/${movie.id}/shows`);
    } else {
      navigate(`/movies/${movie.id}`);
    }
  };

  return (
    <div className="movie-card h-100">
      {/* Poster Image Container */}
      <Link to={`/movies/${movie.id}`} className="movie-poster-wrapper text-decoration-none">
        <img
          src={movie.posterUrl}
          alt={movie.title}
          className="movie-poster-img"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80";
          }}
        />

        {/* Status / Rating Badge */}
        <div className="position-absolute top-0 start-0 m-2 d-flex flex-column gap-1">
          {movie.rating && (
            <span className="badge-custom badge-cinema-dark">
              <IconStar size={13} filled color="#F59E0B" />
              <span>{movie.rating.toFixed(1)}</span>
            </span>
          )}
          {isComingSoon && (
            <span className="badge-custom badge-accent">
              Coming Soon
            </span>
          )}
        </div>

        {/* Favorite Heart Button */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          className="btn position-absolute top-0 end-0 m-2 p-2 rounded-circle border-0 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: 'rgba(11, 11, 15, 0.7)',
            backdropFilter: 'blur(4px)',
            color: favorited ? 'var(--accent-primary)' : '#ffffff',
            transition: 'all 0.2s ease',
            width: '36px',
            height: '36px'
          }}
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
        >
          <IconHeart size={18} filled={favorited} color="var(--accent-primary)" />
        </button>

        {/* Format Tags overlay */}
        <div className="position-absolute bottom-0 start-0 w-100 p-2 d-flex flex-wrap gap-1" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }}>
          {movie.formats?.slice(0, 2).map((fmt, idx) => (
            <span key={idx} className="badge bg-black bg-opacity-75 text-white-50 border border-secondary border-opacity-50 px-2 py-0" style={{ fontSize: '0.65rem' }}>
              {fmt}
            </span>
          ))}
          <span className="badge bg-black bg-opacity-75 text-white-50 border border-secondary border-opacity-50 px-2 py-0 ms-auto" style={{ fontSize: '0.65rem' }}>
            {movie.language}
          </span>
        </div>
      </Link>

      {/* Card Info Body */}
      <div className="p-3 d-flex flex-column flex-grow-1 justify-content-between">
        <div>
          <div className="d-flex align-items-center justify-content-between text-white-50 small mb-1" style={{ fontSize: '0.78rem' }}>
            <span>{new Date(movie.releaseDate).getFullYear()}</span>
            <span className="d-flex align-items-center gap-1">
              <IconClock size={12} />
              {movie.durationFormatted || `${movie.duration}m`}
            </span>
          </div>

          <h5 className="fw-bold text-white mb-1 text-truncate" title={movie.title}>
            <Link to={`/movies/${movie.id}`} className="text-white text-decoration-none hover-text-danger">
              {movie.title}
            </Link>
          </h5>

          {/* Genre list */}
          <p className="text-white-50 small mb-3 text-truncate" style={{ fontSize: '0.8rem' }}>
            {Array.isArray(movie.genre) ? movie.genre.join(' • ') : movie.genre}
          </p>
        </div>

        {/* Actions */}
        <div className="d-flex align-items-center gap-2 pt-2 border-top border-secondary border-opacity-25">
          <Link
            to={`/movies/${movie.id}`}
            className="btn btn-cinema-secondary btn-sm flex-grow-1 text-center"
            style={{ fontSize: '0.825rem', padding: '0.45rem 0.6rem' }}
          >
            Details
          </Link>

          <button
            type="button"
            onClick={handleBookClick}
            disabled={isComingSoon}
            className={`btn btn-sm flex-grow-1 d-flex align-items-center justify-content-center gap-1 ${
              isComingSoon ? 'btn-secondary text-white-50 opacity-75' : 'btn-cinema'
            }`}
            style={{ fontSize: '0.825rem', padding: '0.45rem 0.6rem' }}
          >
            <IconTicket size={15} />
            {isComingSoon ? 'Notify Me' : 'Book'}
          </button>
        </div>
      </div>
    </div>
  );
};
