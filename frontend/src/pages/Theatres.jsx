import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { theatreService } from '../services/theatreService';
import { sampleCities } from '../data/mockTheatres';
import {
  IconMapPin,
  IconStar,
  IconTicket
} from '../components/common/Icons';

export const Theatres = () => {
  const [selectedCity, setSelectedCity] = useState('All');
  const [theatres, setTheatres] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTheatres = async () => {
      setLoading(true);
      const res = await theatreService.getTheatres(selectedCity);
      setTheatres(res.theatres || []);
      setLoading(false);
    };
    fetchTheatres();
  }, [selectedCity]);

  return (
    <div className="container-fluid px-3 px-lg-5 py-5">
      <div className="mb-4">
        <span className="badge bg-danger rounded-pill px-3 py-1 mb-2">Cinema Locations</span>
        <h2 className="fw-extrabold text-white mb-2">IMovies Partner Auditoriums</h2>
        <p className="text-white-50 fs-6" style={{ maxWidth: '650px' }}>
          Explore state-of-the-art theatres equipped with IMAX with Laser, Dolby Atmos 3D sound, and luxury heated recliners.
        </p>
      </div>

      {/* City Filter Pills */}
      <div className="d-flex align-items-center gap-2 mb-4 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => setSelectedCity('All')}
          className={`btn btn-sm px-3 py-2 rounded-pill text-nowrap ${
            selectedCity === 'All' ? 'btn-cinema' : 'btn-cinema-secondary'
          }`}
        >
          All Cities ({sampleCities.length})
        </button>
        {sampleCities.map((city) => (
          <button
            key={city}
            type="button"
            onClick={() => setSelectedCity(city)}
            className={`btn btn-sm px-3 py-2 rounded-pill text-nowrap ${
              selectedCity === city ? 'btn-cinema' : 'btn-cinema-secondary'
            }`}
          >
            {city}
          </button>
        ))}
      </div>

      {/* Theatres Grid */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-danger" role="status" />
          <p className="text-white-50 mt-3 small">Loading cinema venues...</p>
        </div>
      ) : (
        <div className="row g-4">
          {theatres.map((theatre) => (
            <div key={theatre.id} className="col-12 col-md-6 col-lg-4">
              <div
                className="movie-card h-100 p-4 d-flex flex-column justify-content-between shadow-lg"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div>
                  <img
                    src={theatre.image || "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80"}
                    alt={theatre.name}
                    className="rounded-3 w-100 mb-3 object-fit-cover shadow"
                    style={{ height: '180px' }}
                  />

                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="badge bg-danger rounded-pill px-2 py-1">
                      {theatre.city}
                    </span>
                    <span className="text-warning small d-flex align-items-center gap-1">
                      <IconStar size={14} filled />
                      {theatre.rating}
                    </span>
                  </div>

                  <h5 className="fw-bold text-white mb-1">{theatre.name}</h5>
                  <p className="text-white-50 small mb-2 d-flex align-items-center gap-1">
                    <IconMapPin size={14} className="text-danger flex-shrink-0" />
                    <span>{theatre.location} — {theatre.address}</span>
                  </p>

                  <div className="d-flex flex-wrap gap-1 mb-4">
                    {theatre.amenities?.map((am, i) => (
                      <span key={i} className="badge bg-dark border border-secondary text-white-50 px-2 py-1" style={{ fontSize: '0.7rem' }}>
                        {am}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="d-flex align-items-center justify-content-between pt-3 border-top border-secondary border-opacity-25">
                  <span className="text-white-50 small">
                    <strong>{theatre.screensCount}</strong> Auditoriums
                  </span>
                  <Link to="/movies" className="btn btn-cinema btn-sm d-flex align-items-center gap-1">
                    <IconTicket size={14} />
                    View Showtimes
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
