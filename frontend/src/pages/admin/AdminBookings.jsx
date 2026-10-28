import { useState, useEffect } from 'react';
import { bookingService } from '../../services/bookingService';
import {
  IconSearch,
  IconEye,
  IconX
} from '../../components/common/Icons';

export const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedBooking, setSelectedBooking] = useState(null);

  const fetchBookings = async () => {
    const res = await bookingService.getAllBookingsAdmin();
    setBookings(res.bookings || []);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filtered = bookings.filter((b) => {
    const idStr = String(b.id || b._id || '').toLowerCase();
    const custStr = String(b.customerName || b.user?.name || '').toLowerCase();
    const movieStr = String(b.movieTitle || b.movie?.title || '').toLowerCase();
    const q = search.toLowerCase();

    const matchesSearch =
      idStr.includes(q) ||
      custStr.includes(q) ||
      movieStr.includes(q);

    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="admin-bookings-page">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-extrabold text-white mb-1">Ticket Bookings Registry</h2>
          <p className="text-white-50 small mb-0">Search, inspect, and audit all customer reservations across cinemas.</p>
        </div>

        <span className="badge bg-danger rounded-pill px-3 py-2">
          {filtered.length} Bookings Shown
        </span>
      </div>

      {/* Filter bar */}
      <div className="p-3 rounded-4 mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
        <div className="position-relative" style={{ maxWidth: '360px', width: '100%' }}>
          <input
            type="text"
            placeholder="Search by ref (e.g. IMV-), name, movie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="cinema-input form-control text-white ps-5"
          />
          <div className="position-absolute top-50 start-0 translate-middle-y ms-3 text-white-50 pointer-events-none d-flex align-items-center">
            <IconSearch size={16} />
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="text-white-50 small">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="cinema-select form-select form-select-sm"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="p-4 rounded-4 shadow" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
        <div className="table-responsive">
          <table className="table table-cinema mb-0">
            <thead>
              <tr>
                <th>Booking Ref</th>
                <th>Customer Name</th>
                <th>Movie Title</th>
                <th>Show Details</th>
                <th>Seats</th>
                <th>Total</th>
                <th>Payment Status</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td><span className="fw-mono text-danger fw-bold">{b.id}</span></td>
                  <td>
                    <div className="fw-semibold text-white">{b.customerName || b.user?.name || 'Customer'}</div>
                    <small className="text-white-50">{b.customerEmail || b.user?.email || 'N/A'}</small>
                  </td>
                  <td className="text-white fw-medium">{b.movieTitle || b.movie?.title}</td>
                  <td>
                    <div className="text-white-50 small">{b.date} • {b.time}</div>
                    <small className="text-white-50">{b.theatreName}</small>
                  </td>
                  <td>
                    <span className="badge bg-dark border border-secondary text-white">
                      {Array.isArray(b.seats) ? b.seats.join(', ') : b.seats}
                    </span>
                  </td>
                  <td className="fw-bold text-white">${Number(b.totalAmount).toFixed(2)}</td>
                  <td>
                    <span className="badge bg-dark border border-secondary text-white-50">
                      {b.paymentStatus || 'paid (demo)'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${
                      b.status === 'confirmed' ? 'bg-success' : b.status === 'completed' ? 'bg-secondary' : 'bg-danger'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="text-end">
                    <button
                      type="button"
                      onClick={() => setSelectedBooking(b)}
                      className="btn btn-sm btn-cinema-secondary p-1 px-2 d-inline-flex align-items-center gap-1"
                      title="View Details"
                    >
                      <IconEye size={14} />
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
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
              <h5 className="fw-bold text-white mb-0">
                Reservation Record: {selectedBooking.id}
              </h5>
              <button onClick={() => setSelectedBooking(null)} className="btn text-white-50 p-1">
                <IconX size={20} />
              </button>
            </div>

            <div className="d-flex flex-column gap-3 mb-4 text-white-50 small">
              <div className="p-3 rounded-3" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="d-flex justify-content-between mb-1">
                  <span>Customer:</span>
                  <strong className="text-white">{selectedBooking.customerName} ({selectedBooking.customerEmail})</strong>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span>Movie Title:</span>
                  <strong className="text-white">{selectedBooking.movieTitle}</strong>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span>Cinema Theatre:</span>
                  <strong className="text-white">{selectedBooking.theatreName}</strong>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span>Screen & Format:</span>
                  <strong className="text-white">{selectedBooking.screenName} ({selectedBooking.format})</strong>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span>Show Date & Time:</span>
                  <strong className="text-white">{selectedBooking.date} at {selectedBooking.time}</strong>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span>Allocated Seats:</span>
                  <strong className="text-danger">{Array.isArray(selectedBooking.seats) ? selectedBooking.seats.join(', ') : selectedBooking.seats}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Total Transaction:</span>
                  <strong className="text-white fs-6">${Number(selectedBooking.totalAmount).toFixed(2)}</strong>
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <span>Current Status:</span>
                <span className="badge bg-success">{selectedBooking.status?.toUpperCase()}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span>Payment Method:</span>
                <span className="text-white">{selectedBooking.paymentMethod}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span>Security Gate Token:</span>
                <span className="font-monospace text-white">{selectedBooking.qrCodeData}</span>
              </div>
            </div>

            <div className="d-flex align-items-center justify-content-end gap-2 pt-3 border-top border-secondary border-opacity-25">
              <button type="button" onClick={() => setSelectedBooking(null)} className="btn btn-cinema-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
