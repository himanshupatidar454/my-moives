import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { bookingService } from '../services/bookingService';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { toast } from 'react-toastify';
import {
  IconTicket,
  IconMapPin,
  IconCalendar
} from '../components/common/Icons';

export const MyBookings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  // Cancel dialog state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBookingToCancel, setSelectedBookingToCancel] = useState(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingService.getUserBookings(user?.id);
      setBookings(res.bookings || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed fetching user bookings');
      console.error('Failed fetching user bookings', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Filter bookings according to tab
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'upcoming') return b.status === 'confirmed';
    if (activeTab === 'completed') return b.status === 'completed';
    if (activeTab === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  const handleOpenCancelDialog = (booking) => {
    setSelectedBookingToCancel(booking);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedBookingToCancel) return;
    try {
      const res = await bookingService.cancelBooking(selectedBookingToCancel.id);
      if (res.success) {
        toast.info(res.message || `Booking ${selectedBookingToCancel.id} has been cancelled.`);
        setCancelModalOpen(false);
        setSelectedBookingToCancel(null);
        fetchBookings();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to cancel booking.');
    }
  };

  return (
    <div className="container-fluid px-3 px-lg-5 py-5">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <span className="badge bg-danger rounded-pill px-3 py-1 mb-2">Ticket History</span>
          <h2 className="fw-extrabold text-white mb-1">My Cinema Bookings</h2>
          <p className="text-white-50 small mb-0">View upcoming tickets, access digital gate passes, and manage past orders.</p>
        </div>

        <Link to="/movies" className="btn btn-cinema btn-sm">
          Book New Tickets
        </Link>
      </div>

      {/* Tabs */}
      <div className="d-flex align-items-center gap-2 mb-4 border-bottom border-secondary border-opacity-25 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`btn btn-sm px-3 py-2 fw-semibold rounded-pill ${
            activeTab === 'upcoming' ? 'btn-cinema' : 'btn-cinema-secondary'
          }`}
        >
          Upcoming ({bookings.filter((b) => b.status === 'confirmed').length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`btn btn-sm px-3 py-2 fw-semibold rounded-pill ${
            activeTab === 'completed' ? 'btn-cinema' : 'btn-cinema-secondary'
          }`}
        >
          Completed ({bookings.filter((b) => b.status === 'completed').length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cancelled')}
          className={`btn btn-sm px-3 py-2 fw-semibold rounded-pill ${
            activeTab === 'cancelled' ? 'btn-cinema' : 'btn-cinema-secondary'
          }`}
        >
          Cancelled ({bookings.filter((b) => b.status === 'cancelled').length})
        </button>
      </div>

      {/* Bookings List or Empty State */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-danger" role="status" />
          <p className="text-white-50 mt-3 small">Loading your tickets...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          icon={IconTicket}
          title={`No ${activeTab} bookings`}
          message={`You don't have any ${activeTab} tickets right now. Ready for movie night?`}
          actionLabel="Browse Movies Now"
          onAction={() => navigate('/movies')}
        />
      ) : (
        <div className="d-flex flex-column gap-4">
          {filteredBookings.map((b) => {
            const isConfirmed = b.status === 'confirmed';
            const isCancelled = b.status === 'cancelled';

            return (
              <div
                key={b.id}
                className="p-4 rounded-4 shadow-lg"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: isConfirmed ? '1px solid rgba(229, 9, 20, 0.4)' : '1px solid var(--border-subtle)'
                }}
              >
                <div className="row g-4 align-items-center">
                  {/* Poster */}
                  <div className="col-12 col-sm-3 col-md-2 text-center text-sm-start">
                    <img
                      src={b.moviePoster || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80"}
                      alt={b.movieTitle}
                      className="rounded-3 shadow object-fit-cover"
                      style={{ width: '90px', height: '125px' }}
                    />
                  </div>

                  {/* Booking Details */}
                  <div className="col-12 col-sm-9 col-md-6">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className="fw-mono text-danger fw-bold">{b.id}</span>
                      <span
                        className={`badge rounded-pill ${
                          isConfirmed ? 'bg-success' : isCancelled ? 'bg-danger' : 'bg-secondary'
                        }`}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {b.status?.toUpperCase()}
                      </span>
                      <span className="badge bg-dark border border-secondary text-white-50" style={{ fontSize: '0.7rem' }}>
                        {b.format}
                      </span>
                    </div>

                    <h4 className="fw-bold text-white mb-2">{b.movieTitle}</h4>

                    <div className="d-flex flex-column gap-1 text-white-50 small">
                      <span className="d-flex align-items-center gap-1">
                        <IconMapPin size={13} className="text-danger" />
                        {b.theatreName} {b.theatreLocation ? `(${b.theatreLocation})` : ''} • {b.screenName || 'Auditorium'}
                      </span>
                      <span className="d-flex align-items-center gap-1">
                        <IconCalendar size={13} className="text-danger" />
                        {b.date} at <strong className="text-white ms-1">{b.time}</strong>
                      </span>
                      <span>
                        Seats: <strong className="text-white">{Array.isArray(b.seats) ? b.seats.join(', ') : b.seats}</strong> ({b.ticketCount} tickets)
                      </span>
                    </div>
                  </div>

                  {/* Financials & Actions */}
                  <div className="col-12 col-md-4 text-md-end pt-3 pt-md-0 border-top border-md-top-0 border-secondary border-opacity-25">
                    <div className="mb-3">
                      <span className="text-white-50 small d-block">Amount Paid</span>
                      <span className="fs-4 fw-extrabold text-white">${Number(b.totalAmount).toFixed(2)}</span>
                      <small className="text-white-50 d-block" style={{ fontSize: '0.72rem' }}>
                        via {b.paymentMethod}
                      </small>
                    </div>

                    <div className="d-flex align-items-center justify-content-md-end gap-2 flex-wrap">
                      <Link
                        to={`/booking-confirmation/${b.id}`}
                        state={{ booking: b }}
                        className="btn btn-cinema btn-sm d-flex align-items-center gap-1"
                      >
                        <IconTicket size={14} />
                        View Ticket
                      </Link>

                      {isConfirmed && (
                        <button
                          type="button"
                          onClick={() => handleOpenCancelDialog(b)}
                          className="btn btn-outline-danger btn-sm"
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog for Cancellation */}
      <ConfirmDialog
        isOpen={cancelModalOpen}
        title="Cancel Ticket Reservation"
        message={`Are you sure you want to cancel booking reference "${selectedBookingToCancel?.id}" for ${selectedBookingToCancel?.movieTitle}? Refund will be credited according to policy.`}
        confirmLabel="Yes, Cancel Booking"
        cancelLabel="Keep Booking"
        variant="danger"
        onConfirm={handleConfirmCancel}
        onCancel={() => {
          setCancelModalOpen(false);
          setSelectedBookingToCancel(null);
        }}
      />
    </div>
  );
};
