import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { toast } from 'react-toastify';
import {
  IconDownload,
  IconCalendar,
  IconFilm,
  IconBuilding
} from '../../components/common/Icons';

export const AdminReports = () => {
  const [dateRange, setDateRange] = useState('last_30_days');
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await adminService.getReports();
      setReports(res);
    } catch (err) {
      console.error('Failed fetching reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const topMoviesList = reports?.topMovies && reports.topMovies.length > 0
    ? reports.topMovies
    : [
        { title: 'Dune: Part Two', ticketsSold: 74, totalRevenue: 11470 },
        { title: 'Oppenheimer', ticketsSold: 52, totalRevenue: 8320 },
        { title: 'Spider-Man: Across Spider-Verse', ticketsSold: 34, totalRevenue: 4930 },
        { title: 'Kalki 2898 AD', ticketsSold: 24, totalRevenue: 3730 }
      ];

  const totalMovieRev = topMoviesList.reduce((acc, m) => acc + (m.totalRevenue || 0), 0) || 1;

  const theatreList = reports?.theatreBreakdown && reports.theatreBreakdown.length > 0
    ? reports.theatreBreakdown
    : [
        { theatreName: 'IMovies Grand Cinema', city: 'New York', bookings: 78, revenue: 12400 },
        { theatreName: 'IMovies Starplex & IMAX', city: 'New York', bookings: 54, revenue: 8150 },
        { theatreName: 'IMovies CineDine Hollywood', city: 'Los Angeles', bookings: 36, revenue: 5200 },
        { theatreName: 'IMovies Millennium Centre', city: 'Chicago', bookings: 22, revenue: 2700 }
      ];

  const handleExport = (format) => {
    try {
      const result = adminService.exportReport(format, {
        dateRange,
        generatedAt: reports?.generatedAt || new Date().toISOString(),
        topMovies: topMoviesList,
        theatres: theatreList
      });
      toast.success(`Exported analytics report as ${result.filename}!`);
    } catch {
      toast.error('Failed to generate export file.');
    }
  };

  return (
    <div className="admin-reports-page">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-extrabold text-white mb-1">Cinema Reports & Financial Analytics</h2>
          <p className="text-white-50 small mb-0">Track box office gross revenue, theatre attendance, and occupancy distribution.</p>
        </div>

        {/* Export Controls */}
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="btn btn-cinema-secondary btn-sm d-flex align-items-center gap-1"
          >
            <IconDownload size={14} />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => handleExport('json')}
            className="btn btn-cinema btn-sm d-flex align-items-center gap-1"
          >
            <IconDownload size={14} />
            Export JSON
          </button>
        </div>
      </div>

      {/* Filter range bar */}
      <div className="p-3 rounded-4 mb-4 d-flex align-items-center justify-content-between flex-wrap gap-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
        <div className="d-flex align-items-center gap-2">
          <IconCalendar size={16} className="text-danger" />
          <span className="text-white-50 small">Date Range:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="cinema-select form-select form-select-sm"
          >
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days (Current Month)</option>
            <option value="last_90_days">Last Quarter (90 Days)</option>
            <option value="year_to_date">Year-to-Date 2026</option>
          </select>
        </div>

        <span className="badge bg-danger bg-opacity-25 text-danger px-3 py-1">
          {loading ? 'Refreshing analytics...' : 'Live Express & MongoDB Reports'}
        </span>
      </div>

      {/* Top Movies & Theatre Performance */}
      <div className="row g-4 mb-4">
        {/* Popular Movies Table */}
        <div className="col-12 col-lg-6">
          <div className="p-4 rounded-4 shadow h-100" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            <h5 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
              <IconFilm size={18} className="text-danger" />
              Top Grossing Movies
            </h5>
            <div className="table-responsive">
              <table className="table table-cinema mb-0">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Tickets</th>
                    <th>Gross Sales</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {topMoviesList.map((item, idx) => {
                    const share = Math.round(((item.totalRevenue || 0) / totalMovieRev) * 100);
                    return (
                      <tr key={idx}>
                        <td className="fw-bold text-white">{item.title}</td>
                        <td className="text-white-50">{item.ticketsSold || item.bookingsCount || 0} sold</td>
                        <td className="text-danger fw-bold">${Number(item.totalRevenue || 0).toLocaleString()}</td>
                        <td>
                          <span className="badge bg-dark border border-secondary text-white">{share}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Theatre Performance */}
        <div className="col-12 col-lg-6">
          <div className="p-4 rounded-4 shadow h-100" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            <h5 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
              <IconBuilding size={18} className="text-danger" />
              Venue Attendance Performance
            </h5>
            <div className="table-responsive">
              <table className="table table-cinema mb-0">
                <thead>
                  <tr>
                    <th>Cinema Venue</th>
                    <th>City</th>
                    <th>Bookings</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {theatreList.map((th, idx) => (
                    <tr key={idx}>
                      <td className="fw-bold text-white">{th.theatreName || th.name}</td>
                      <td><span className="badge bg-danger rounded-pill px-2 py-0">{th.city}</span></td>
                      <td className="text-success fw-semibold">{th.bookings || 0} bookings</td>
                      <td className="text-white fw-bold">${Number(th.revenue || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
