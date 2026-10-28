import { useState, useEffect } from 'react';
import { showService } from '../../services/showService';
import { movieService } from '../../services/movieService';
import { theatreService } from '../../services/theatreService';
import { toast } from 'react-toastify';
import {
  IconClock,
  IconTrash,
  IconX
} from '../../components/common/Icons';

export const AdminShows = () => {
  const [shows, setShows] = useState([]);
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    movieId: '',
    theatreId: '',
    screenName: 'Screen 1 - IMAX Laser',
    format: 'IMAX 3D',
    language: 'English',
    time: '07:00 PM',
    date: new Date().toISOString().split('T')[0],
    standardPrice: 15.00,
    premiumPrice: 22.00,
    vipPrice: 28.00,
    status: 'available'
  });

  const fetchShows = async () => {
    try {
      const res = await showService.getAllShows();
      setShows(res.shows || []);
    } catch (err) {
      console.error('Failed fetching shows', err);
    }
  };

  const loadResources = async () => {
    try {
      const [movieRes, theatreRes] = await Promise.all([
        movieService.getMovies(),
        theatreService.getTheatres()
      ]);
      setMovies(movieRes.movies || []);
      setTheatres(theatreRes.theatres || []);
    } catch (err) {
      console.error('Failed fetching resources for shows', err);
    }
  };

  useEffect(() => {
    fetchShows();
    loadResources();
  }, []);

  const handleOpenCreate = () => {
    const firstMovieId = movies[0]?.id || movies[0]?._id || '';
    const firstTheatreId = theatres[0]?.id || theatres[0]?._id || '';
    setFormData({
      movieId: firstMovieId,
      theatreId: firstTheatreId,
      screenName: 'Screen 1 - IMAX Laser',
      format: 'IMAX 3D',
      language: 'English',
      time: '07:00 PM',
      date: new Date().toISOString().split('T')[0],
      standardPrice: 15.00,
      premiumPrice: 22.00,
      vipPrice: 28.00,
      status: 'available'
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      await showService.createShow({
        ...formData,
        standardPrice: Number(formData.standardPrice),
        premiumPrice: Number(formData.premiumPrice),
        vipPrice: Number(formData.vipPrice || 28.00)
      });
      toast.success('New show scheduled successfully!');
      setModalOpen(false);
      fetchShows();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule show.');
    }
  };

  const handleDeleteShow = async (id) => {
    try {
      await showService.deleteShow(id);
      toast.info('Showtime slot removed from schedules.');
      fetchShows();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove show.');
    }
  };

  const getMovieTitle = (show) => {
    if (show?.movie && typeof show.movie === 'object' && show.movie.title) {
      return show.movie.title;
    }
    const id = show?.movieId || show?.movie;
    const m = movies.find((mov) => (mov.id === id || mov._id === id));
    return m ? m.title : (show?.movieTitle || 'Dune: Part Two');
  };

  const getTheatreName = (show) => {
    if (show?.theatre && typeof show.theatre === 'object' && show.theatre.name) {
      return show.theatre.name;
    }
    const id = show?.theatreId || show?.theatre;
    const th = theatres.find((t) => (t.id === id || t._id === id));
    return th ? th.name : (show?.theatreName || 'IMovies Grand Cinema');
  };

  return (
    <div className="admin-shows-page">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-extrabold text-white mb-1">Showtime Schedules & Pricing</h2>
          <p className="text-white-50 small mb-0">Associate movie titles to cinema screens, schedule dates, and configure seat prices.</p>
        </div>

        <button onClick={handleOpenCreate} className="btn btn-cinema d-flex align-items-center gap-2">
          <IconClock size={18} />
          Schedule New Show
        </button>
      </div>

      <div className="p-4 rounded-4 shadow" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
        <div className="table-responsive">
          <table className="table table-cinema mb-0">
            <thead>
              <tr>
                <th>Show Code</th>
                <th>Movie Title</th>
                <th>Cinema Venue</th>
                <th>Screen</th>
                <th>Format</th>
                <th>Show Time</th>
                <th>Standard / Premium</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shows.map((show) => (
                <tr key={show.id || show._id}>
                  <td>
                    <span className="fw-mono text-danger fw-bold">{show.id || show._id}</span>
                  </td>
                  <td className="fw-bold text-white">{getMovieTitle(show)}</td>
                  <td className="text-white-50">{getTheatreName(show)}</td>
                  <td className="text-white-50">{show.screenName || show.screen?.name || 'Screen 1'}</td>
                  <td>
                    <span className="badge bg-dark border border-secondary text-white">
                      {show.format}
                    </span>
                  </td>
                  <td className="text-white">
                    <span className="fw-semibold">{show.time}</span>
                    <small className="text-white-50 d-block">{show.date}</small>
                  </td>
                  <td>
                    <span className="text-white">${show.standardPrice?.toFixed(2)}</span>
                    <span className="text-white-50 mx-1">/</span>
                    <span className="text-danger fw-bold">${show.premiumPrice?.toFixed(2)}</span>
                  </td>
                  <td>
                    <span className={`badge ${show.status === 'available' ? 'bg-success' : 'bg-warning'}`}>
                      {show.status}
                    </span>
                  </td>
                  <td className="text-end">
                    <button
                      type="button"
                      onClick={() => handleDeleteShow(show.id || show._id)}
                      className="btn btn-sm btn-outline-danger p-1"
                      title="Delete Showtime"
                    >
                      <IconTrash size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1060 }}
        >
          <div
            className="cinema-modal rounded-4 shadow-2xl p-4 overflow-y-auto"
            style={{
              maxWidth: '560px',
              width: '100%',
              backgroundColor: 'var(--bg-modal)',
              border: '1px solid var(--border-strong)'
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-4 pb-2 border-bottom border-secondary border-opacity-25">
              <h5 className="fw-bold text-white mb-0">Schedule New Showtime Slot</h5>
              <button onClick={() => setModalOpen(false)} className="btn text-white-50 p-1">
                <IconX size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="mb-3">
                <label className="cinema-label">Select Movie Title:</label>
                <select
                  value={formData.movieId}
                  onChange={(e) => setFormData({ ...formData, movieId: e.target.value })}
                  className="cinema-select form-select"
                  required
                >
                  <option value="">-- Choose Movie --</option>
                  {movies.map((m) => (
                    <option key={m.id || m._id} value={m.id || m._id}>{m.title} ({m.language})</option>
                  ))}
                </select>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-12 col-sm-6">
                  <label className="cinema-label">Select Theatre:</label>
                  <select
                    value={formData.theatreId}
                    onChange={(e) => setFormData({ ...formData, theatreId: e.target.value })}
                    className="cinema-select form-select"
                    required
                  >
                    <option value="">-- Choose Theatre --</option>
                    {theatres.map((th) => (
                      <option key={th.id || th._id} value={th.id || th._id}>{th.name} ({th.city})</option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-sm-6">
                  <label className="cinema-label">Screen Auditorium:</label>
                  <input
                    type="text"
                    value={formData.screenName}
                    onChange={(e) => setFormData({ ...formData, screenName: e.target.value })}
                    className="cinema-input form-control text-white"
                    required
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-12 col-sm-6">
                  <label className="cinema-label">Projection Format:</label>
                  <select
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    className="cinema-select form-select"
                  >
                    <option value="IMAX 3D">IMAX 3D Laser</option>
                    <option value="Dolby Cinema">Dolby Cinema Atmos</option>
                    <option value="2D 4K">2D Digital 4K</option>
                    <option value="3D Prime">3D Prime Laser</option>
                  </select>
                </div>
                <div className="col-12 col-sm-6">
                  <label className="cinema-label">Language:</label>
                  <input
                    type="text"
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="cinema-input form-control text-white"
                    required
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-12 col-sm-6">
                  <label className="cinema-label">Show Date:</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="cinema-input form-control text-white"
                    required
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label className="cinema-label">Start Time:</label>
                  <input
                    type="text"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    placeholder="e.g. 07:00 PM"
                    className="cinema-input form-control text-white"
                    required
                  />
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6">
                  <label className="cinema-label">Standard Seat Price ($):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={formData.standardPrice}
                    onChange={(e) => setFormData({ ...formData, standardPrice: e.target.value })}
                    className="cinema-input form-control text-white"
                    required
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label className="cinema-label">Premium Recliner Price ($):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={formData.premiumPrice}
                    onChange={(e) => setFormData({ ...formData, premiumPrice: e.target.value })}
                    className="cinema-input form-control text-white"
                    required
                  />
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-cinema-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-cinema">
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
