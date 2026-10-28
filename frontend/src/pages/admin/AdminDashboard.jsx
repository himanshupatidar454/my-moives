import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { bookingService } from '../../services/bookingService';
import {
  IconFilm,
  IconBuilding,
  IconClock,
  IconTicket,
  IconUsers,
  IconSparkles,
  IconTrending,
  IconBarChart
} from '../../components/common/Icons';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const [dashRes, bookRes] = await Promise.all([
          adminService.getDashboardStats(),
          bookingService.getAllBookingsAdmin()
        ]);
        setStats(dashRes.stats);
        setRecentBookings((bookRes.bookings || []).slice(0, 5));
      } catch (err) {
        console.error('Failed fetching admin stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-danger" role="status" />
        <p className="text-white-50 mt-3 small">Loading management dashboard analytics...</p>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Movies', value: stats?.totalMovies ?? 0, icon: IconFilm, link: '/admin/movies', color: '#E50914' },
    { title: 'Cinema Theatres', value: stats?.totalTheatres ?? 0, icon: IconBuilding, link: '/admin/theatres', color: '#38BDF8' },
    { title: 'Upcoming Shows', value: stats?.upcomingShows ?? 0, icon: IconClock, link: '/admin/shows', color: '#F59E0B' },
    { title: 'Total Bookings', value: stats?.totalBookings ?? 0, icon: IconTicket, link: '/admin/bookings', color: '#22C55E' },
    { title: 'Revenue (Confirmed)', value: `$${Number(stats?.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: IconTrending, link: '/admin/reports', color: '#A855F7' },
    { title: 'Registered Users', value: stats?.registeredUsers ?? 0, icon: IconUsers, link: '/admin/users', color: '#EC4899' }
  ];

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-extrabold text-white mb-1">Cinema Management Overview</h2>
          <p className="text-white-50 small mb-0">
            Real-time operations, inventory metrics, and sample booking revenue.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-25 px-3 py-2 small">
            <IconSparkles size={14} className="me-1" />
            Express API Ready
          </span>
          <Link to="/admin/reports" className="btn btn-cinema btn-sm">
            View Full Reports
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="row g-3 mb-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="col-12 col-sm-6 col-lg-4 col-xl-2">
              <Link to={card.link} className="text-decoration-none">
                <div
                  className="p-3 rounded-4 shadow-sm h-100 transition-all border hover-border-danger"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-white-50 small text-truncate" style={{ fontSize: '0.78rem' }}>{card.title}</span>
                    <div
                      className="p-2 rounded-3"
                      style={{ backgroundColor: `${card.color}20`, color: card.color }}
                    >
                      <Icon size={16} />
                    </div>
                  </div>
                  <h4 className="fw-extrabold text-white mb-0">{card.value}</h4>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Sample Monthly Revenue & Booking Trends Visual */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-8">
          <div className="p-4 rounded-4 shadow h-100" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            <div className="d-flex align-items-center justify-content-between mb-4">
              <div>
                <h5 className="fw-bold text-white mb-1 d-flex align-items-center gap-2">
                  <IconBarChart size={18} className="text-danger" />
                  Monthly Revenue Trends (Demonstration Data)
                </h5>
                <small className="text-white-50">6-month ticket revenue trajectory</small>
              </div>
              <span className="badge bg-dark border border-secondary text-white-50">2026 Trend</span>
            </div>

            {/* Custom Cinema Bar Chart */}
            <div className="d-flex align-items-end justify-content-between pt-4" style={{ height: '220px' }}>
              {[
                { month: 'May', val: 14200, height: '48%' },
                { month: 'Jun', val: 21900, height: '74%' },
                { month: 'Jul', val: 29800, height: '100%' },
                { month: 'Aug', val: 26400, height: '88%' },
                { month: 'Sep', val: 23100, height: '78%' },
                { month: 'Oct', val: 28450, height: '95%' }
              ].map((item, i) => (
                <div key={i} className="d-flex flex-column align-items-center flex-grow-1">
                  <span className="text-white-50 small mb-2" style={{ fontSize: '0.72rem' }}>
                    ${(item.val / 1000).toFixed(1)}k
                  </span>
                  <div
                    className="w-50 rounded-top transition-all"
                    style={{
                      height: item.height,
                      background: 'linear-gradient(to top, #E50914 0%, #FF525D 100%)',
                      boxShadow: '0 4px 12px rgba(229, 9, 20, 0.4)'
                    }}
                  />
                  <span className="text-white-50 small mt-2 fw-semibold" style={{ fontSize: '0.75rem' }}>
                    {item.month}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Management Shortcuts */}
        <div className="col-12 col-lg-4">
          <div className="p-4 rounded-4 shadow h-100" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            <h5 className="fw-bold text-white mb-3">Quick Actions</h5>
            <div className="d-flex flex-column gap-2 mb-4">
              <Link to="/admin/movies" className="btn btn-cinema-secondary text-start d-flex align-items-center gap-2 py-2">
                <IconFilm size={16} className="text-danger" />
                <span>Add / Edit Movie Release</span>
              </Link>
              <Link to="/admin/shows" className="btn btn-cinema-secondary text-start d-flex align-items-center gap-2 py-2">
                <IconClock size={16} className="text-warning" />
                <span>Schedule New Showtimes</span>
              </Link>
              <Link to="/admin/theatres" className="btn btn-cinema-secondary text-start d-flex align-items-center gap-2 py-2">
                <IconBuilding size={16} className="text-info" />
                <span>Configure Theatres & Screens</span>
              </Link>
              <Link to="/admin/reports" className="btn btn-cinema-secondary text-start d-flex align-items-center gap-2 py-2">
                <IconTrending size={16} className="text-success" />
                <span>Export Sales & Tax Report</span>
              </Link>
            </div>

            <div className="p-3 rounded-3" style={{ backgroundColor: 'rgba(229, 9, 20, 0.1)', border: '1px solid rgba(229, 9, 20, 0.25)' }}>
              <div className="d-flex align-items-center gap-2 mb-1">
                <IconSparkles size={16} className="text-danger" />
                <span className="fw-bold text-white small">Express & MongoDB Contract</span>
              </div>
              <p className="text-white-50 small mb-0" style={{ fontSize: '0.78rem' }}>
                All CRUD interfaces map directly to standard REST endpoints ready to plug into Express routes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className="p-4 rounded-4 shadow" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h5 className="fw-bold text-white mb-0 d-flex align-items-center gap-2">
            <IconTicket size={18} className="text-danger" />
            Recent Bookings
          </h5>
          <Link to="/admin/bookings" className="text-danger small text-decoration-none fw-semibold">
            View All ({stats?.totalBookings})
          </Link>
        </div>

        <div className="table-responsive">
          <table className="table table-cinema mb-0">
            <thead>
              <tr>
                <th>Booking Ref</th>
                <th>Customer</th>
                <th>Movie</th>
                <th>Seats</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b) => (
                <tr key={b.id}>
                  <td><span className="fw-mono text-danger fw-bold">{b.id}</span></td>
                  <td>
                    <div className="fw-medium text-white">{b.customerName}</div>
                    <small className="text-white-50">{b.customerEmail}</small>
                  </td>
                  <td className="text-white fw-medium">{b.movieTitle}</td>
                  <td><span className="badge bg-dark border border-secondary text-white">{Array.isArray(b.seats) ? b.seats.join(', ') : b.seats}</span></td>
                  <td className="text-white fw-bold">${Number(b.totalAmount).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${b.status === 'confirmed' ? 'bg-success' : b.status === 'completed' ? 'bg-secondary' : 'bg-danger'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="text-white-50 small">{b.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
