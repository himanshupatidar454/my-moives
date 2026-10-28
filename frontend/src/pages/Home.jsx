import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { movieService } from '../services/movieService';
import { theatreService } from '../services/theatreService';
import { MovieCard } from '../components/movies/MovieCard';
import { TrailerModal } from '../components/movies/TrailerModal';
import { genresList, languagesList } from '../data/mockMovies';
import {
  IconFilm,
  IconTicket,
  IconPlay,
  IconStar,
  IconClock,
  IconSparkles,
  IconChevronRight,
  IconShield
} from '../components/common/Icons';

export const Home = () => {
  const [featuredMovies, setFeaturedMovies] = useState([]);
  const [nowShowing, setNowShowing] = useState([]);
  const [comingSoon, setComingSoon] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [trailerModalOpen, setTrailerModalOpen] = useState(false);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [featuredRes, allRes, theatreRes] = await Promise.all([
          movieService.getFeaturedMovies(),
          movieService.getMovies(),
          theatreService.getTheatres()
        ]);

        setFeaturedMovies(featuredRes);
        setNowShowing(allRes.movies.filter((m) => m.status === 'now_showing' || m.status === 'now-showing'));
        setComingSoon(allRes.movies.filter((m) => m.status === 'coming_soon' || m.status === 'coming-soon'));
        setTheatres(theatreRes.theatres.slice(0, 4));
      } catch (err) {
        console.error('Failed to load home data', err);
      }
    };
    loadHomeData();
  }, []);

  const heroMovie = featuredMovies[activeHeroIndex] || featuredMovies[0];

  return (
    <div className="home-page pb-5">
      {/* 1. HERO SECTION */}
      {heroMovie && (
        <section
          className="hero-banner position-relative d-flex align-items-center"
          style={{
            backgroundImage: `url(${heroMovie.backdropUrl})`,
            minHeight: '620px',
            backgroundColor: '#0B0B0F'
          }}
        >
          <div className="hero-overlay" />

          <div className="container-fluid px-3 px-lg-5 position-relative z-1 py-5">
            <div className="row align-items-center">
              <div className="col-12 col-lg-8 col-xl-7">
                {/* Hero Badges */}
                <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
                  <span className="badge-custom badge-accent">
                    <IconSparkles size={13} />
                    Featured Premiere
                  </span>
                  <span className="badge-custom badge-cinema-dark">
                    <IconStar size={13} filled color="#F59E0B" />
                    {heroMovie.rating?.toFixed(1)} / 10
                  </span>
                  <span className="badge-custom badge-cinema-dark">
                    <IconClock size={13} />
                    {heroMovie.durationFormatted}
                  </span>
                  <span className="badge-custom badge-cinema-dark">
                    {heroMovie.language}
                  </span>
                </div>

                {/* Hero Title */}
                <h1 className="display-4 fw-extrabold text-white mb-3" style={{ letterSpacing: '-0.03em', lineHeight: 1.15 }}>
                  {heroMovie.title}
                </h1>

                {/* Hero Genres */}
                <div className="d-flex align-items-center gap-2 mb-3 text-white-50 small">
                  {heroMovie.genre?.map((g, i) => (
                    <span key={i} className="badge bg-secondary bg-opacity-25 text-white px-2 py-1">
                      {g}
                    </span>
                  ))}
                  <span className="mx-1">•</span>
                  <span>Directed by <strong>{heroMovie.director}</strong></span>
                </div>

                {/* Hero Synopsis */}
                <p className="text-white-50 fs-6 mb-4 pe-lg-4" style={{ maxWidth: '620px', lineHeight: 1.7 }}>
                  {heroMovie.synopsis}
                </p>

                {/* Hero Action Buttons */}
                <div className="d-flex align-items-center flex-wrap gap-3">
                  <Link
                    to={`/movies/${heroMovie.id}/shows`}
                    className="btn btn-cinema btn-lg px-4 py-3 fw-bold"
                  >
                    <IconTicket size={20} />
                    Book Tickets Now
                  </Link>

                  {heroMovie.trailerUrl && (
                    <button
                      type="button"
                      onClick={() => setTrailerModalOpen(true)}
                      className="btn btn-cinema-secondary btn-lg px-4 py-3 fw-semibold"
                    >
                      <IconPlay size={18} fill="currentColor" />
                      Watch Trailer
                    </button>
                  )}

                  <Link
                    to={`/movies/${heroMovie.id}`}
                    className="btn btn-outline-light btn-lg px-3 py-3 border-secondary"
                  >
                    Details
                  </Link>
                </div>
              </div>

              {/* Hero Mini Selector thumbnails */}
              <div className="col-12 col-lg-4 col-xl-5 mt-4 mt-lg-0 d-none d-lg-block">
                <div className="p-3 rounded-4 shadow-lg ms-auto" style={{ backgroundColor: 'rgba(21, 21, 29, 0.75)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.12)', maxWidth: '380px' }}>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-white-50 small fw-bold text-uppercase" style={{ letterSpacing: '0.05em' }}>
                      Spotlight Selection
                    </span>
                    <span className="badge bg-danger rounded-pill px-2 py-0" style={{ fontSize: '0.7rem' }}>
                      {featuredMovies.length} Hits
                    </span>
                  </div>

                  <div className="d-flex flex-column gap-2">
                    {featuredMovies.slice(0, 3).map((m, idx) => (
                      <div
                        key={m.id}
                        onClick={() => setActiveHeroIndex(idx)}
                        className={`p-2 rounded-3 d-flex align-items-center gap-3 cursor-pointer transition-all ${
                          activeHeroIndex === idx ? 'bg-danger bg-opacity-25 border border-danger' : 'hover-bg-secondary border border-transparent'
                        }`}
                        style={{ cursor: 'pointer' }}
                      >
                        <img
                          src={m.posterUrl}
                          alt={m.title}
                          className="rounded-2 object-fit-cover"
                          width="48"
                          height="64"
                        />
                        <div className="flex-grow-1 overflow-hidden">
                          <h6 className="fw-bold text-white mb-0 text-truncate" style={{ fontSize: '0.9rem' }}>
                            {m.title}
                          </h6>
                          <small className="text-white-50 d-block text-truncate">
                            {m.genre?.slice(0, 2).join(', ')}
                          </small>
                          <div className="d-flex align-items-center gap-2 mt-1">
                            <span className="text-warning small d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                              <IconStar size={11} filled />
                              {m.rating}
                            </span>
                            <span className="text-white-50 small" style={{ fontSize: '0.75rem' }}>
                              {m.durationFormatted}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. PROMOTIONAL PERKS BAR */}
      <section className="py-3 border-bottom border-secondary border-opacity-25" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="container-fluid px-3 px-lg-5">
          <div className="row g-3 text-center text-md-start">
            <div className="col-12 col-md-4 d-flex align-items-center justify-content-center justify-content-md-start gap-3">
              <div className="p-2 rounded-3 bg-danger bg-opacity-10 text-danger">
                <IconTicket size={24} />
              </div>
              <div>
                <h6 className="fw-bold text-white mb-0">Instant E-Tickets</h6>
                <small className="text-white-50">Show digital QR tickets directly at cinema entrance</small>
              </div>
            </div>
            <div className="col-12 col-md-4 d-flex align-items-center justify-content-center justify-content-md-start gap-3">
              <div className="p-2 rounded-3 bg-danger bg-opacity-10 text-danger">
                <IconSparkles size={24} />
              </div>
              <div>
                <h6 className="fw-bold text-white mb-0">Premium Formats</h6>
                <small className="text-white-50">IMAX 70mm, 4K Laser, Dolby Atmos & ScreenX 270°</small>
              </div>
            </div>
            <div className="col-12 col-md-4 d-flex align-items-center justify-content-center justify-content-md-start gap-3">
              <div className="p-2 rounded-3 bg-danger bg-opacity-10 text-danger">
                <IconShield size={24} />
              </div>
              <div>
                <h6 className="fw-bold text-white mb-0">Hassle-Free Cancellation</h6>
                <small className="text-white-50">Instant refund credits up to 2 hours before show</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. NOW SHOWING SECTION */}
      <section className="py-5">
        <div className="container-fluid px-3 px-lg-5">
          <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
            <div>
              <span className="text-danger fw-bold small text-uppercase tracking-wider">In Theatres Now</span>
              <h2 className="fw-extrabold text-white mb-0">Now Showing</h2>
            </div>
            <Link to="/movies?status=now_showing" className="btn btn-cinema-secondary btn-sm d-flex align-items-center gap-1">
              Explore All Movies
              <IconChevronRight size={16} />
            </Link>
          </div>

          <div className="row g-4">
            {nowShowing.slice(0, 4).map((movie) => (
              <div key={movie.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. QUICK BROWSE BY GENRE & LANGUAGE */}
      <section className="py-4 my-2" style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container-fluid px-3 px-lg-5">
          <div className="row g-4 align-items-center">
            <div className="col-12 col-lg-6">
              <h5 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
                <IconFilm size={18} className="text-danger" />
                Browse by Genre
              </h5>
              <div className="d-flex flex-wrap gap-2">
                {genresList.filter((g) => g !== 'All').map((g) => (
                  <Link
                    key={g}
                    to={`/movies?genre=${encodeURIComponent(g)}`}
                    className="badge bg-dark border border-secondary text-white-50 hover-text-white py-2 px-3 text-decoration-none rounded-pill"
                    style={{ transition: 'all 0.2s ease' }}
                  >
                    {g}
                  </Link>
                ))}
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <h5 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
                <IconSparkles size={18} className="text-danger" />
                Browse by Language
              </h5>
              <div className="d-flex flex-wrap gap-2">
                {languagesList.filter((l) => l !== 'All').map((l) => (
                  <Link
                    key={l}
                    to={`/movies?language=${encodeURIComponent(l)}`}
                    className="badge bg-dark border border-secondary text-white-50 hover-text-white py-2 px-3 text-decoration-none rounded-pill"
                    style={{ transition: 'all 0.2s ease' }}
                  >
                    {l}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. COMING SOON SECTION */}
      <section className="py-5">
        <div className="container-fluid px-3 px-lg-5">
          <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
            <div>
              <span className="text-warning fw-bold small text-uppercase tracking-wider">Upcoming Premieres</span>
              <h2 className="fw-extrabold text-white mb-0">Coming Soon to IMovies</h2>
            </div>
            <Link to="/movies?status=coming_soon" className="btn btn-cinema-secondary btn-sm d-flex align-items-center gap-1">
              View All Upcoming
              <IconChevronRight size={16} />
            </Link>
          </div>

          <div className="row g-4">
            {comingSoon.slice(0, 3).map((movie) => (
              <div key={movie.id} className="col-12 col-sm-6 col-lg-4">
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FEATURED THEATRES SECTION */}
      <section className="py-5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="container-fluid px-3 px-lg-5">
          <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
            <div>
              <span className="text-danger fw-bold small text-uppercase tracking-wider">Cinema Venues</span>
              <h2 className="fw-extrabold text-white mb-0">Featured Auditoriums & Theatres</h2>
            </div>
            <Link to="/theatres" className="btn btn-cinema-secondary btn-sm d-flex align-items-center gap-1">
              Explore All Theatres
              <IconChevronRight size={16} />
            </Link>
          </div>

          <div className="row g-4">
            {theatres.map((theatre) => (
              <div key={theatre.id} className="col-12 col-md-6 col-lg-3">
                <div className="movie-card h-100 p-3 d-flex flex-column justify-content-between">
                  <div>
                    <img
                      src={theatre.image}
                      alt={theatre.name}
                      className="rounded-3 w-100 mb-3 object-fit-cover"
                      style={{ height: '140px' }}
                    />
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className="badge bg-danger rounded-pill px-2 py-0" style={{ fontSize: '0.7rem' }}>
                        {theatre.city}
                      </span>
                      <span className="text-warning small d-flex align-items-center gap-1">
                        <IconStar size={12} filled />
                        {theatre.rating}
                      </span>
                    </div>
                    <h6 className="fw-bold text-white mb-1">{theatre.name}</h6>
                    <p className="text-white-50 small mb-2">{theatre.location}</p>

                    <div className="d-flex flex-wrap gap-1 mb-3">
                      {theatre.amenities?.slice(0, 2).map((am, i) => (
                        <span key={i} className="badge bg-black text-white-50 border border-secondary border-opacity-25 px-2 py-1" style={{ fontSize: '0.65rem' }}>
                          {am}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link to={`/movies`} className="btn btn-cinema-secondary btn-sm w-100 text-center">
                    Check Showtimes
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. CINEMA CTA BANNER */}
      <section className="py-5">
        <div className="container-fluid px-3 px-lg-5">
          <div
            className="p-5 rounded-4 position-relative overflow-hidden shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #1C1C26 0%, #15151D 50%, #0B0B0F 100%)',
              border: '1px solid rgba(229, 9, 20, 0.3)'
            }}
          >
            <div className="row align-items-center position-relative z-1">
              <div className="col-12 col-lg-8">
                <span className="badge bg-danger mb-3 px-3 py-1">Experience The Magic</span>
                <h2 className="display-6 fw-bold text-white mb-3">
                  Ready to book your next cinematic adventure?
                </h2>
                <p className="text-white-50 fs-6 mb-4" style={{ maxWidth: '600px' }}>
                  Reserve your favorite luxury recliner, pre-order hot buttery popcorn, and get ready for an unforgettable movie experience with IMovies.
                </p>
                <div className="d-flex align-items-center flex-wrap gap-3">
                  <Link to="/movies" className="btn btn-cinema btn-lg px-4 py-3 fw-bold">
                    Browse All Movies
                  </Link>
                  <Link to="/register" className="btn btn-cinema-secondary btn-lg px-4 py-3">
                    Create Free Account
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trailer Modal */}
      {heroMovie && (
        <TrailerModal
          isOpen={trailerModalOpen}
          onClose={() => setTrailerModalOpen(false)}
          trailerUrl={heroMovie.trailerUrl}
          movieTitle={heroMovie.title}
        />
      )}
    </div>
  );
};
