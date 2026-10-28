import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { movieService } from '../services/movieService';
import { reviewService } from '../services/reviewService';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { StarRating } from '../components/common/StarRating';
import { TrailerModal } from '../components/movies/TrailerModal';
import { toast } from 'react-toastify';
import {
  IconHeart,
  IconTicket,
  IconPlay,
  IconClock,
  IconCalendar,
  IconCheck
} from '../components/common/Icons';

export const MovieDetails = () => {
  const { movieId } = useParams();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [movie, setMovie] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trailerModalOpen, setTrailerModalOpen] = useState(false);

  // Review submission state
  const [newRating, setNewRating] = useState(5);
  const [newReviewText, setNewReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchMovieData = async () => {
      setLoading(true);
      try {
        const [movieRes, reviewRes] = await Promise.all([
          movieService.getMovieById(movieId),
          reviewService.getReviewsByMovie(movieId)
        ]);

        if (movieRes.movie) {
          setMovie(movieRes.movie);
        }
        setReviews(reviewRes.reviews || []);
      } catch (err) {
        console.error('Failed fetching movie details', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovieData();
  }, [movieId]);

  if (loading) {
    return (
      <div className="text-center py-5 min-vh-50 d-flex flex-column align-items-center justify-content-center">
        <div className="spinner-border text-danger" role="status" />
        <p className="text-white-50 mt-3 small">Loading movie presentation...</p>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="container py-5 text-center">
        <h3 className="text-white fw-bold mb-3">Movie Not Found</h3>
        <p className="text-white-50 mb-4">The movie you requested does not exist or may have been removed.</p>
        <Link to="/movies" className="btn btn-cinema">Back to Movies</Link>
      </div>
    );
  }

  const favorited = isFavorite(movie.id || movie._id);
  const isComingSoon = movie.status === 'coming_soon' || movie.status === 'coming-soon';

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!newReviewText.trim()) {
      toast.warning('Please enter your review text before submitting.');
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await reviewService.submitReview({
        movieId: movie.id,
        author: user?.name || 'Cinema Enthusiast',
        avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        rating: newRating,
        content: newReviewText.trim()
      });

      if (res.success) {
        setReviews([res.review, ...reviews]);
        setNewReviewText('');
        toast.success(res.message || 'Your review has been published!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="movie-details-page pb-5">
      {/* 1. CINEMATIC BACKDROP HERO */}
      <section
        className="position-relative py-5"
        style={{
          backgroundImage: `url(${movie.backdropUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#0B0B0F',
          minHeight: '480px'
        }}
      >
        <div className="hero-overlay" />

        <div className="container-fluid px-3 px-lg-5 position-relative z-1">
          <div className="row g-4 align-items-center">
            {/* Poster column */}
            <div className="col-12 col-md-4 col-lg-3 text-center text-md-start">
              <div className="position-relative d-inline-block rounded-4 overflow-hidden shadow-2xl border border-secondary border-opacity-50">
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="img-fluid"
                  style={{ maxHeight: '440px', objectFit: 'cover' }}
                />
                <button
                  type="button"
                  onClick={() => toggleFavorite(movie)}
                  className="btn position-absolute top-0 end-0 m-2 p-2 rounded-circle border-0 d-flex align-items-center justify-content-center"
                  style={{
                    backgroundColor: 'rgba(11, 11, 15, 0.75)',
                    color: favorited ? 'var(--accent-primary)' : '#ffffff'
                  }}
                  title={favorited ? "Remove from favorites" : "Add to favorites"}
                >
                  <IconHeart size={20} filled={favorited} color="var(--accent-primary)" />
                </button>
              </div>
            </div>

            {/* Details Column */}
            <div className="col-12 col-md-8 col-lg-9">
              <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
                <span className={`badge ${isComingSoon ? 'bg-warning text-dark' : 'bg-danger'} rounded-pill px-3 py-1`}>
                  {isComingSoon ? 'Coming Soon' : 'Now Showing'}
                </span>
                <span className="badge bg-dark border border-secondary text-white-50 px-2 py-1">
                  {movie.language}
                </span>
                {movie.formats?.map((fmt, i) => (
                  <span key={i} className="badge bg-dark border border-secondary text-white px-2 py-1">
                    {fmt}
                  </span>
                ))}
              </div>

              <h1 className="display-5 fw-extrabold text-white mb-2" style={{ letterSpacing: '-0.02em' }}>
                {movie.title}
              </h1>

              {/* Rating and Metadata */}
              <div className="d-flex align-items-center flex-wrap gap-3 mb-3">
                <div className="d-flex align-items-center gap-2 bg-dark bg-opacity-75 px-3 py-1 rounded-pill border border-secondary border-opacity-25">
                  <StarRating rating={movie.rating} size={18} showScore />
                  <span className="text-white-50 small">
                    ({movie.voteCount?.toLocaleString() || '1,200'} votes)
                  </span>
                </div>

                <span className="d-flex align-items-center gap-1 text-white-50 small">
                  <IconClock size={15} />
                  {movie.durationFormatted || `${movie.duration}m`}
                </span>

                <span className="d-flex align-items-center gap-1 text-white-50 small">
                  <IconCalendar size={15} />
                  {movie.releaseDate}
                </span>
              </div>

              {/* Genre Pills */}
              <div className="d-flex flex-wrap gap-2 mb-3">
                {movie.genre?.map((g, idx) => (
                  <span key={idx} className="badge bg-secondary bg-opacity-25 text-white px-2 py-1">
                    {g}
                  </span>
                ))}
              </div>

              {/* Synopsis */}
              <p className="text-white-50 fs-6 mb-4 pe-lg-5" style={{ maxWidth: '800px', lineHeight: 1.7 }}>
                {movie.synopsis}
              </p>

              {/* Director */}
              <p className="text-white-50 small mb-4">
                Director: <strong className="text-white">{movie.director}</strong>
              </p>

              {/* Action Buttons */}
              <div className="d-flex align-items-center flex-wrap gap-3">
                {isComingSoon ? (
                  <button
                    disabled
                    className="btn btn-secondary btn-lg px-4 py-3 fw-bold opacity-75"
                  >
                    Ticket Booking Opens Soon
                  </button>
                ) : (
                  <Link
                    to={`/movies/${movie.id}/shows`}
                    className="btn btn-cinema btn-lg px-4 py-3 fw-bold"
                  >
                    <IconTicket size={20} />
                    Book Tickets Now
                  </Link>
                )}

                {movie.trailerUrl && (
                  <button
                    type="button"
                    onClick={() => setTrailerModalOpen(true)}
                    className="btn btn-cinema-secondary btn-lg px-4 py-3 fw-semibold"
                  >
                    <IconPlay size={18} fill="currentColor" />
                    Watch Official Trailer
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => toggleFavorite(movie)}
                  className="btn btn-outline-light btn-lg px-3 py-3 border-secondary d-flex align-items-center gap-2"
                >
                  <IconHeart size={18} filled={favorited} color="var(--accent-primary)" />
                  {favorited ? 'In Favorites' : 'Add to Favorites'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CAST & CREW SECTION */}
      {movie.cast && movie.cast.length > 0 && (
        <section className="py-5 border-bottom border-secondary border-opacity-25">
          <div className="container-fluid px-3 px-lg-5">
            <h4 className="fw-bold text-white mb-4">Featured Cast & Characters</h4>
            <div className="row g-4">
              {movie.cast.map((actor, idx) => (
                <div key={idx} className="col-6 col-sm-4 col-md-3 col-lg-2 text-center">
                  <div className="p-3 rounded-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <img
                      src={actor.avatar}
                      alt={actor.name}
                      className="rounded-circle mb-2 object-fit-cover shadow"
                      width="72"
                      height="72"
                    />
                    <h6 className="fw-bold text-white mb-0 small text-truncate">{actor.name}</h6>
                    <small className="text-white-50 d-block text-truncate" style={{ fontSize: '0.75rem' }}>
                      {actor.role}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. RATINGS & REVIEWS SECTION */}
      <section className="py-5">
        <div className="container-fluid px-3 px-lg-5">
          <div className="row g-4">
            {/* Reviews Summary Column */}
            <div className="col-12 col-lg-4">
              <div className="p-4 rounded-4 mb-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <h5 className="fw-bold text-white mb-3">Audience Rating</h5>
                <div className="d-flex align-items-baseline gap-2 mb-2">
                  <span className="display-4 fw-extrabold text-white">{movie.rating.toFixed(1)}</span>
                  <span className="text-white-50">/ 10</span>
                </div>
                <div className="mb-3">
                  <StarRating rating={movie.rating} size={22} showScore={false} />
                </div>
                <p className="text-white-50 small mb-0">
                  Based on verified cinema audiences and critical reviews. All demo reviews shown below.
                </p>
              </div>

              {/* Submit a Review Form */}
              <div className="p-4 rounded-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <h5 className="fw-bold text-white mb-3">Rate & Write a Review</h5>
                <form onSubmit={handleReviewSubmit}>
                  <div className="mb-3">
                    <label className="cinema-label">Your Rating (out of 5 stars):</label>
                    <div>
                      <StarRating
                        rating={newRating}
                        size={24}
                        interactive={true}
                        onChange={(val) => setNewRating(val)}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="cinema-label">Your Thoughts & Feedback:</label>
                    <textarea
                      rows="4"
                      value={newReviewText}
                      onChange={(e) => setNewReviewText(e.target.value)}
                      placeholder="What did you think of the cinematography, sound, and performances?..."
                      className="cinema-input form-control text-white"
                      style={{ fontSize: '0.9rem' }}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="btn btn-cinema w-100"
                  >
                    {submittingReview ? 'Submitting...' : 'Post Movie Review'}
                  </button>
                  <small className="text-white-50 d-block text-center mt-2" style={{ fontSize: '0.75rem' }}>
                    Reviews are saved into demo storage.
                  </small>
                </form>
              </div>
            </div>

            {/* Reviews List Column */}
            <div className="col-12 col-lg-8">
              <div className="d-flex align-items-center justify-content-between mb-4">
                <h4 className="fw-bold text-white mb-0">
                  Customer Reviews ({reviews.length})
                </h4>
              </div>

              {reviews.length === 0 ? (
                <div className="p-4 rounded-4 text-center text-white-50" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  No reviews yet for this movie. Be the first to share your thoughts!
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 rounded-4"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="d-flex align-items-center gap-3">
                          <img
                            src={rev.avatar}
                            alt={rev.author}
                            className="rounded-circle object-fit-cover"
                            width="40"
                            height="40"
                          />
                          <div>
                            <div className="d-flex align-items-center gap-2">
                              <span className="fw-bold text-white small">{rev.author}</span>
                              {rev.verifiedPurchase && (
                                <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25 px-2 py-0" style={{ fontSize: '0.65rem' }}>
                                  <IconCheck size={10} /> Verified Ticket
                                </span>
                              )}
                            </div>
                            <small className="text-white-50">{rev.date}</small>
                          </div>
                        </div>

                        <div className="d-flex align-items-center">
                          <StarRating rating={rev.rating} size={16} showScore />
                        </div>
                      </div>

                      <p className="text-white-50 small mb-0" style={{ lineHeight: 1.6 }}>
                        "{rev.content}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Trailer Modal */}
      <TrailerModal
        isOpen={trailerModalOpen}
        onClose={() => setTrailerModalOpen(false)}
        trailerUrl={movie.trailerUrl}
        movieTitle={movie.title}
      />
    </div>
  );
};
