import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { bookingService } from '../services/bookingService';
import { USE_MOCKS } from '../utils/env';
import { toast } from 'react-toastify';
import {
  IconCheck,
  IconPrinter,
  IconTicket,
  IconFilm,
  IconClock,
  IconMapPin,
  IconSparkles
} from '../components/common/Icons';

export const BookingConfirmation = () => {
  const { bookingId } = useParams();
  const location = useLocation();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!booking);

  useEffect(() => {
    if (!booking && bookingId) {
      const fetchBooking = async () => {
        setLoading(true);
        try {
          const res = await bookingService.getBookingById(bookingId);
          setBooking(res.booking);
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to retrieve booking');
        } finally {
          setLoading(false);
        }
      };
      fetchBooking();
    }
  }, [bookingId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-danger" role="status" />
        <p className="text-white-50 mt-3 small">Retrieving confirmed booking details...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container py-5 text-center">
        <h3 className="text-white fw-bold mb-3">Booking Not Found</h3>
        <p className="text-white-50 mb-4">Could not find booking reference "{bookingId}".</p>
        <Link to="/my-bookings" className="btn btn-cinema">View My Bookings</Link>
      </div>
    );
  }

  const movieTitle = booking.movieTitle || booking.movie?.title || 'Cinema Feature';
  const moviePoster = booking.moviePoster || booking.movie?.posterUrl || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80";
  const theatreName = booking.theatreName || booking.theatre?.name || 'IMovies Cinema';
  const theatreLocation = booking.theatreLocation || booking.theatre?.city || booking.theatre?.address || '';
  const showFormat = booking.format || booking.show?.format || '2D';
  const showDate = booking.date || booking.show?.date || '';
  const showTime = booking.time || booking.show?.time || '';
  const screenName = booking.screenName || booking.screen?.name || 'Screen 1';
  const seatsList = Array.isArray(booking.seats)
    ? booking.seats.map((s) => (typeof s === 'string' ? s : s.seatIdentifier)).join(', ')
    : (booking.selectedSeats?.join(', ') || booking.seats || '');
  const ticketCount = booking.ticketCount || (Array.isArray(booking.seats) ? booking.seats.length : (booking.selectedSeats?.length || 1));
  const totalPaid = Number(booking.totalAmount || 0).toFixed(2);

  return (
    <div className="container py-5">
      {/* Top success badge banner */}
      <div className="text-center mb-5 no-print">
        <div
          className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle bg-success text-white mb-3 shadow"
          style={{ width: '64px', height: '64px' }}
        >
          <IconCheck size={36} />
        </div>
        <h2 className="fw-extrabold text-white mb-2">Booking Confirmed!</h2>
        <p className="text-white-50 fs-6 mx-auto" style={{ maxWidth: '480px' }}>
          Your cinema tickets have been booked and confirmed. An e-ticket receipt is ready below.
        </p>

        {USE_MOCKS && (
          <div className="d-inline-flex align-items-center gap-2 badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-25 px-3 py-1">
            <IconSparkles size={14} />
            Demo Mode Confirmation
          </div>
        )}
      </div>

      {/* TICKET STUB CARD */}
      <div
        className="ticket-stub mx-auto shadow-2xl p-4 p-md-5 mb-5"
        style={{
          maxWidth: '720px',
          backgroundColor: '#161622',
          border: '1.5px dashed rgba(255, 255, 255, 0.25)',
          borderRadius: '24px'
        }}
      >
        <div className="ticket-notch-left" />
        <div className="ticket-notch-right" />

        {/* Ticket Header */}
        <div className="d-flex align-items-center justify-content-between pb-4 mb-4 border-bottom border-secondary border-opacity-25 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <div
              className="d-flex align-items-center justify-content-center rounded-3 bg-danger text-white"
              style={{ width: '32px', height: '32px' }}
            >
              <IconFilm size={18} />
            </div>
            <span className="fw-bold fs-5 text-white">IMovies E-Ticket</span>
          </div>

          <div className="text-end">
            <span className="text-white-50 small d-block">Booking Reference</span>
            <span className="fw-mono fs-5 fw-bold text-danger">{booking.id || booking.bookingReference}</span>
          </div>
        </div>

        {/* Movie & Show Info */}
        <div className="row g-4 align-items-center mb-4">
          <div className="col-12 col-sm-4 text-center text-sm-start">
            <img
              src={moviePoster}
              alt={movieTitle}
              className="rounded-3 shadow-lg object-fit-cover"
              style={{ width: '130px', height: '180px' }}
            />
          </div>

          <div className="col-12 col-sm-8">
            <span className="badge bg-danger rounded-pill px-2 py-0 mb-2">{showFormat}</span>
            <h4 className="fw-bold text-white mb-2">{movieTitle}</h4>
            <p className="text-white-50 small mb-2 d-flex align-items-center gap-1">
              <IconMapPin size={14} className="text-danger" />
              {theatreName} {theatreLocation ? `— ${theatreLocation}` : ''}
            </p>
            <p className="text-white-50 small mb-2 d-flex align-items-center gap-1">
              <IconClock size={14} className="text-danger" />
              {showDate} at <strong className="text-white ms-1">{showTime}</strong>
            </p>
            <p className="text-white-50 small mb-0">
              Screen: <strong className="text-white">{screenName}</strong>
            </p>
          </div>
        </div>

        {/* Ticket Details Strip */}
        <div
          className="p-3 rounded-3 mb-4"
          style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="row g-2 text-center">
            <div className="col-4 border-end border-secondary border-opacity-25">
              <small className="text-white-50 d-block">Seats</small>
              <strong className="text-white fs-6">{seatsList}</strong>
            </div>
            <div className="col-4 border-end border-secondary border-opacity-25">
              <small className="text-white-50 d-block">Quantity</small>
              <strong className="text-white fs-6">{ticketCount} Tickets</strong>
            </div>
            <div className="col-4">
              <small className="text-white-50 d-block">Total Paid</small>
              <strong className="text-danger fs-6">${totalPaid}</strong>
            </div>
          </div>
        </div>

        {/* QR Code & Scan Instructions */}
        <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3 pt-3 border-top border-secondary border-opacity-25">
          <div className="text-center text-sm-start">
            <small className="text-white-50 d-block mb-1">Entry Gate Passcode</small>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25">
                VERIFIED TICKET
              </span>
              <span className="text-white-50 small">Show at entrance turnstile</span>
            </div>
          </div>

          {/* SVG QR Code */}
          <div className="p-2 rounded-2 bg-white d-inline-flex flex-column align-items-center">
            <svg width="84" height="84" viewBox="0 0 100 100" fill="#000000">
              <rect width="100" height="100" fill="#FFFFFF"/>
              <rect x="10" y="10" width="25" height="25" fill="#000000"/>
              <rect x="15" y="15" width="15" height="15" fill="#FFFFFF"/>
              <rect x="18" y="18" width="9" height="9" fill="#000000"/>

              <rect x="65" y="10" width="25" height="25" fill="#000000"/>
              <rect x="70" y="15" width="15" height="15" fill="#FFFFFF"/>
              <rect x="73" y="18" width="9" height="9" fill="#000000"/>

              <rect x="10" y="65" width="25" height="25" fill="#000000"/>
              <rect x="15" y="70" width="15" height="15" fill="#FFFFFF"/>
              <rect x="18" y="73" width="9" height="9" fill="#000000"/>

              <rect x="42" y="15" width="8" height="8"/>
              <rect x="52" y="25" width="8" height="8"/>
              <rect x="42" y="42" width="16" height="16"/>
              <rect x="65" y="45" width="8" height="8"/>
              <rect x="75" y="55" width="8" height="8"/>
              <rect x="45" y="70" width="8" height="8"/>
              <rect x="65" y="75" width="15" height="8"/>
            </svg>
            <span style={{ fontSize: '0.55rem', color: '#333333', fontWeight: 'bold' }}>SCAN FOR ENTRY</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="d-flex align-items-center justify-content-center flex-wrap gap-3 no-print">
        <button onClick={handlePrint} className="btn btn-cinema-secondary d-flex align-items-center gap-2">
          <IconPrinter size={18} />
          Print / Download Ticket
        </button>

        <Link to="/my-bookings" className="btn btn-cinema d-flex align-items-center gap-2">
          <IconTicket size={18} />
          View All Bookings
        </Link>

        <Link to="/" className="btn btn-outline-light">
          Return Home
        </Link>
      </div>
    </div>
  );
};
