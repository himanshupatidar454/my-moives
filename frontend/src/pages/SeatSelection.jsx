import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { showService } from '../services/showService';
import { movieService } from '../services/movieService';
import { theatreService } from '../services/theatreService';
import { createShowSocket } from '../services/socketService';
import { CinemaScreen } from '../components/seats/CinemaScreen';
import { SeatLegend } from '../components/seats/SeatLegend';
import { SeatGrid } from '../components/seats/SeatGrid';
import { BookingSummaryBar } from '../components/seats/BookingSummaryBar';
import { toast } from 'react-toastify';
import { IconChevronLeft, IconClock } from '../components/common/Icons';

export const SeatSelection = () => {
  const { showId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve state passed from ShowSelection if available
  const stateData = location.state || {};
  const [movie, setMovie] = useState(stateData.movie || null);
  const [theatre, setTheatre] = useState(stateData.theatre || null);
  const [show, setShow] = useState(stateData.show || null);
  const [date] = useState(stateData.date || { label: "Today" });

  const [seatRows, setSeatRows] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [pricingInfo, setPricingInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        // Fetch show details if not passed through location state
        let currentShow = show;
        let pricing = null;
        let fee = null;
        let maxSeats = null;

        if (!currentShow) {
          const showRes = await showService.getShowById(showId);
          currentShow = showRes.show;
          pricing = showRes.pricing;
          fee = showRes.ticketFee;
          maxSeats = showRes.maxSeatsPerBooking;
          setShow(currentShow);
        }

        // Fetch movie if needed
        if (!movie && currentShow?.movieId) {
          const movieRes = await movieService.getMovieById(currentShow.movieId);
          setMovie(movieRes.movie);
        }

        // Fetch theatre if needed
        if (!theatre && currentShow?.theatreId) {
          const theatreRes = await theatreService.getTheatreById(currentShow.theatreId);
          setTheatre(theatreRes.theatre);
        }

        // Fetch seat layout matrix
        const seatRes = await showService.getSeatLayoutForShow(showId);
        setSeatRows(seatRes.seatLayout || []);

        setPricingInfo({
          standardPrice: seatRes.pricing?.standardPrice ?? pricing?.standardPrice ?? currentShow?.standardPrice ?? 14.50,
          premiumPrice: seatRes.pricing?.premiumPrice ?? pricing?.premiumPrice ?? currentShow?.premiumPrice ?? 21.00,
          vipPrice: seatRes.pricing?.vipPrice ?? pricing?.vipPrice ?? currentShow?.vipPrice ?? 28.00,
          ticketFee: seatRes.ticketFee ?? fee ?? currentShow?.ticketFee ?? 1.50,
          maxSeatsPerBooking: seatRes.maxSeatsPerBooking ?? maxSeats ?? currentShow?.maxSeatsPerBooking ?? 10
        });
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed loading seating data.');
        console.error('Failed loading seating data', err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [showId]);

  // Real-time seat inventory synchronization via Socket.IO
  useEffect(() => {
    if (!showId) return;

    const socket = createShowSocket();

    // Join the show's room on entry
    socket.emit('join-show', showId);

    // Update seat grid when seats-updated events arrive
    socket.on('seats-updated', (data) => {
      if (!data || (data.showId && data.showId.toString() !== showId.toString())) return;

      const updatedMap = new Map();
      if (Array.isArray(data.seats)) {
        data.seats.forEach((s) => {
          if (s && s.id) {
            updatedMap.set(s.id, s.status);
          }
        });
      }

      if (updatedMap.size === 0) return;

      // Update seat grid
      setSeatRows((prevRows) =>
        prevRows.map((rowObj) => ({
          ...rowObj,
          seats: rowObj.seats.map((seat) => {
            if (updatedMap.has(seat.id)) {
              return {
                ...seat,
                status: updatedMap.get(seat.id)
              };
            }
            return seat;
          })
        }))
      );

      // If a seat the user has selected is taken by someone else, remove it and show a message
      setSelectedSeats((prevSelected) => {
        const takenSeats = [];
        const keptSeats = [];

        for (const seat of prevSelected) {
          const newStatus = updatedMap.get(seat.id);
          if (newStatus && newStatus !== 'available') {
            takenSeats.push(seat.id);
          } else {
            keptSeats.push(seat);
          }
        }

        if (takenSeats.length > 0) {
          toast.info(
            `Seat${takenSeats.length > 1 ? 's' : ''} ${takenSeats.join(', ')} was just reserved by another customer and removed from your selection.`
          );
        }

        return keptSeats;
      });
    });

    return () => {
      // Leave show's room on exit and disconnect
      socket.emit('leave-show', showId);
      socket.disconnect();
    };
  }, [showId]);

  // Authoritative prices and limits from show/seat layout
  const standardPrice = pricingInfo?.standardPrice ?? show?.standardPrice ?? 14.50;
  const premiumPrice = pricingInfo?.premiumPrice ?? show?.premiumPrice ?? 21.00;
  const vipPrice = pricingInfo?.vipPrice ?? show?.vipPrice ?? 28.00;
  const ticketFee = pricingInfo?.ticketFee ?? show?.ticketFee ?? 1.50;
  const maxSeatsPerBooking = pricingInfo?.maxSeatsPerBooking ?? show?.maxSeatsPerBooking ?? 10;

  // Toggle seat selection
  const handleToggleSeat = (seat) => {
    const isUnavailable =
      seat.status === 'occupied' ||
      seat.status === 'reserved' ||
      seat.status === 'booked' ||
      seat.status === 'unavailable';
    if (isUnavailable) return;

    const exists = selectedSeats.some((s) => s.id === seat.id);
    if (exists) {
      setSelectedSeats((prev) => prev.filter((s) => s.id !== seat.id));
    } else {
      if (selectedSeats.length >= maxSeatsPerBooking) {
        toast.warning(`You can select a maximum of ${maxSeatsPerBooking} seats per transaction.`);
        return;
      }
      setSelectedSeats((prev) => [...prev, seat]);
    }
  };

  // Price calculations with server-configured prices: VIP seats use VIP price!
  const subtotal = selectedSeats.reduce((sum, seat) => {
    if (typeof seat.price === 'number') {
      return sum + seat.price;
    }
    if (seat.type === 'vip') return sum + vipPrice;
    if (seat.type === 'premium') return sum + premiumPrice;
    return sum + standardPrice;
  }, 0);

  const bookingFee = selectedSeats.length > 0 ? ticketFee * selectedSeats.length : 0;
  const totalAmount = subtotal + bookingFee;

  const handleProceedToCheckout = () => {
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat to continue.');
      return;
    }

    // Pass data forward to Checkout page
    navigate('/checkout', {
      state: {
        movie,
        theatre,
        show,
        date,
        selectedSeats,
        subtotal,
        bookingFee,
        totalAmount
      }
    });
  };

  if (loading) {
    return (
      <div className="text-center py-5 min-vh-50 d-flex flex-column align-items-center justify-content-center">
        <div className="spinner-border text-danger" role="status" />
        <p className="text-white-50 mt-3 small">Loading interactive auditorium seat matrix...</p>
      </div>
    );
  }

  return (
    <div className="seat-selection-page container-fluid px-3 px-lg-5 py-4">
      {/* Navigation & Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-3">
          <Link
            to={`/movies/${movie?.id}/shows`}
            className="btn btn-cinema-secondary btn-sm d-flex align-items-center gap-1"
          >
            <IconChevronLeft size={16} />
            Back to Shows
          </Link>
          <div>
            <h4 className="fw-bold text-white mb-0">{movie?.title}</h4>
            <div className="d-flex align-items-center gap-2 text-white-50 small">
              <span className="text-danger fw-medium">{theatre?.name}</span>
              <span>•</span>
              <span className="d-flex align-items-center gap-1">
                <IconClock size={12} />
                {date?.label || date} at {show?.time} ({show?.format})
              </span>
            </div>
          </div>
        </div>

        <div className="badge bg-dark border border-secondary text-white-50 px-3 py-2">
          Max {maxSeatsPerBooking} tickets / booking
        </div>
      </div>

      <div className="row g-4">
        {/* Auditorium & Seats Layout (Left Column) */}
        <div className="col-12 col-xl-8">
          <div
            className="p-4 rounded-4 shadow-lg"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            {/* Screen Arc */}
            <CinemaScreen />

            {/* Seat Grid */}
            <SeatGrid
              seatRows={seatRows}
              selectedSeats={selectedSeats}
              onToggleSeat={handleToggleSeat}
            />

            {/* Seat Legend */}
            <div className="mt-5">
              <SeatLegend />
            </div>
          </div>
        </div>

        {/* Booking Summary Sidebar (Right Column) */}
        <div className="col-12 col-xl-4">
          <BookingSummaryBar
            movie={movie}
            theatre={theatre}
            show={show}
            date={date}
            selectedSeats={selectedSeats}
            subtotal={subtotal}
            bookingFee={bookingFee}
            total={totalAmount}
            onProceed={handleProceedToCheckout}
          />
        </div>
      </div>
    </div>
  );
};
