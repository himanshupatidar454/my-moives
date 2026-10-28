import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { bookingService } from '../services/bookingService';
import { paymentService } from '../services/paymentService';
import { toast } from 'react-toastify';
import {
  IconTicket,
  IconShield,
  IconCreditCard,
  IconChevronLeft
} from '../components/common/Icons';

export const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const checkoutData = location.state || {};
  const {
    movie,
    theatre,
    show,
    date,
    selectedSeats = [],
    subtotal = 0,
    bookingFee = 0
  } = checkoutData;

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [processing, setProcessing] = useState(false);

  // If page was directly opened with no seats selected
  if (!movie || selectedSeats.length === 0) {
    return (
      <div className="container py-5 text-center">
        <h3 className="text-white fw-bold mb-3">No Active Booking Session</h3>
        <p className="text-white-50 mb-4">Please select a movie and your preferred seats before proceeding to checkout.</p>
        <Link to="/movies" className="btn btn-cinema">Explore Movies</Link>
      </div>
    );
  }

  // Server-authoritative coupon verification
  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      toast.warning('Please enter a coupon code.');
      return;
    }

    try {
      const res = await bookingService.verifyCoupon(couponCode.trim(), subtotal);
      if (res?.valid) {
        setDiscount(res.discount);
        setAppliedCoupon(res.couponCode);
        toast.success(res.message || `Coupon ${res.couponCode} applied! $${Number(res.discount).toFixed(2)} discount.`);
      }
    } catch (err) {
      setDiscount(0);
      setAppliedCoupon(null);
      const msg = err.response?.data?.message || err.message || 'Invalid coupon code.';
      toast.error(msg);
    }
  };

  const finalAmount = Math.max(0, Math.round((subtotal + bookingFee - discount) * 100) / 100);

  // Real 3-step checkout order:
  // 1) create the booking on the server
  // 2) create the payment order using the real booking ID
  // 3) verify the payment on the server
  // 4) show confirmation from the server's booking data
  const handleCompletePayment = async () => {
    if (!termsAgreed) {
      toast.warning('Please agree to the booking terms and cancellation policy to proceed.');
      return;
    }

    setProcessing(true);
    try {
      // Step 1: Create booking on server with show ID and seat identifiers
      const showId = show?.id || show?._id;
      const seatIdentifiers = selectedSeats.map((s) => s.id || s.seatIdentifier);

      const bookingRes = await bookingService.createBooking({
        showId,
        seatIdentifiers,
        couponCode: appliedCoupon || (discount > 0 ? couponCode.trim() : undefined)
      });

      const serverBooking = bookingRes.booking;
      const realBookingId = serverBooking?._id || serverBooking?.id;

      if (!realBookingId) {
        throw new Error('Server did not return a valid booking ID');
      }

      // Step 2: Create payment order with real booking ID
      const paymentOrder = await paymentService.createPaymentOrder(realBookingId);

      // Step 3: Verify payment with real order ID
      const verification = await paymentService.verifyPayment(paymentOrder.orderId, {
        simulatedSuccess: true,
        paymentMethod,
        bookingId: realBookingId
      });

      if (verification?.verified) {
        // Step 4: Show confirmation using server-returned booking data
        const confirmedBooking = verification.booking || serverBooking;
        toast.success('Booking confirmed! Generating your digital cinema ticket...');
        navigate(`/booking-confirmation/${confirmedBooking.id || confirmedBooking._id}`, {
          state: { booking: confirmedBooking }
        });
      } else {
        throw new Error('Payment verification was not approved.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors && err.response.data.errors[0]?.msg) ||
        err.message ||
        'Payment verification failed. Please try again.';
      toast.error(msg);
      console.error('[Checkout Error]', err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="checkout-page container-fluid px-3 px-lg-5 py-5">
      <div className="d-flex align-items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="btn btn-cinema-secondary btn-sm d-flex align-items-center gap-1"
        >
          <IconChevronLeft size={16} />
          Back to Seats
        </button>
        <div>
          <h2 className="fw-extrabold text-white mb-0">Secure Cinema Checkout</h2>
          <small className="text-white-50">Review your tickets and select your payment method</small>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Order Breakdown & Payment Methods */}
        <div className="col-12 col-lg-7">
          {/* Booking Summary Box */}
          <div className="p-4 rounded-4 mb-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            <h5 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
              <IconTicket size={20} className="text-danger" />
              Ticket Selection Details
            </h5>

            <div className="d-flex gap-3 align-items-center pb-3 border-bottom border-secondary border-opacity-25 mb-3">
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="rounded-3 object-fit-cover shadow"
                width="64"
                height="90"
              />
              <div>
                <h5 className="fw-bold text-white mb-1">{movie.title}</h5>
                <p className="text-white-50 small mb-1">{theatre?.name} • {theatre?.city || theatre?.location}</p>
                <p className="text-white-50 small mb-0">
                  <span className="badge bg-danger rounded-pill px-2 py-0 me-2">{show?.format}</span>
                  {date?.label || date} at {show?.time}
                </p>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center text-white-50 small mb-2">
              <span>Selected Seats:</span>
              <span className="fw-bold text-white">{selectedSeats.map((s) => s.id).join(', ')}</span>
            </div>
            <div className="d-flex justify-content-between align-items-center text-white-50 small mb-2">
              <span>Ticket Count:</span>
              <span className="text-white">{selectedSeats.length} {selectedSeats.length === 1 ? 'ticket' : 'tickets'}</span>
            </div>
            <div className="d-flex justify-content-between align-items-center text-white-50 small mb-2">
              <span>Auditorium Screen:</span>
              <span className="text-white">{show?.screenName || 'Screen 1'}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="p-4 rounded-4 mb-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            <h5 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
              <IconCreditCard size={20} className="text-danger" />
              Select Payment Method
            </h5>

            <div className="d-flex flex-column gap-3 mb-4">
              <label
                className={`p-3 rounded-3 border d-flex align-items-center justify-content-between cursor-pointer ${
                  paymentMethod === 'card' ? 'border-danger bg-danger bg-opacity-10' : 'border-secondary border-opacity-25'
                }`}
                style={{ cursor: 'pointer' }}
              >
                <div className="d-flex align-items-center gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="form-check-input"
                  />
                  <div>
                    <span className="fw-bold text-white d-block">Credit / Debit Card</span>
                    <small className="text-white-50">Visa, Mastercard, Amex</small>
                  </div>
                </div>
                <IconCreditCard size={24} className="text-white-50" />
              </label>

              <label
                className={`p-3 rounded-3 border d-flex align-items-center justify-content-between cursor-pointer ${
                  paymentMethod === 'upi' ? 'border-danger bg-danger bg-opacity-10' : 'border-secondary border-opacity-25'
                }`}
                style={{ cursor: 'pointer' }}
              >
                <div className="d-flex align-items-center gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'upi'}
                    onChange={() => setPaymentMethod('upi')}
                    className="form-check-input"
                  />
                  <div>
                    <span className="fw-bold text-white d-block">Instant UPI / QR Code</span>
                    <small className="text-white-50">Google Pay, PhonePe, Paytm, BHIM</small>
                  </div>
                </div>
                <span className="badge bg-dark border border-secondary text-white-50">Instant</span>
              </label>

              <label
                className={`p-3 rounded-3 border d-flex align-items-center justify-content-between cursor-pointer ${
                  paymentMethod === 'wallet' ? 'border-danger bg-danger bg-opacity-10' : 'border-secondary border-opacity-25'
                }`}
                style={{ cursor: 'pointer' }}
              >
                <div className="d-flex align-items-center gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'wallet'}
                    onChange={() => setPaymentMethod('wallet')}
                    className="form-check-input"
                  />
                  <div>
                    <span className="fw-bold text-white d-block">Digital Cinema Wallet</span>
                    <small className="text-white-50">IMovies Credits, Apple Pay, PayPal</small>
                  </div>
                </div>
                <span className="badge bg-dark border border-secondary text-white-50">1-Click</span>
              </label>
            </div>

            {/* Terms checkbox */}
            <div className="form-check">
              <input
                type="checkbox"
                id="termsCheck"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="form-check-input"
                required
              />
              <label htmlFor="termsCheck" className="form-check-label text-white-50 small">
                I understand that tickets can be cancelled up to 2 hours prior to showtime and agree to the IMovies terms of purchase.
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing Breakdown & Payment Execution */}
        <div className="col-12 col-lg-5">
          <div className="p-4 rounded-4 shadow-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-strong)' }}>
            <h5 className="fw-bold text-white mb-3">Payment Summary</h5>

            {/* Server-verified Promo Code Form */}
            <form onSubmit={handleApplyCoupon} className="mb-4">
              <label className="cinema-label">Discount Coupon / Gift Code:</label>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="e.g. IMOVIES5"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="cinema-input form-control text-white"
                />
                <button type="submit" className="btn btn-cinema-secondary">
                  Apply
                </button>
              </div>
              <small className="text-white-50 d-block mt-1" style={{ fontSize: '0.72rem' }}>
                Tip: Try server code <code>IMOVIES5</code> ($5 off) or <code>PREMIERE10</code> (10% off)
              </small>
            </form>

            {/* Line Items */}
            <div className="d-flex flex-column gap-2 pb-3 border-bottom border-secondary border-opacity-25 mb-3 text-white-50 small">
              <div className="d-flex justify-content-between">
                <span>Tickets Subtotal:</span>
                <span className="text-white">${subtotal.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Convenience & Booking Fee:</span>
                <span className="text-white">${bookingFee.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="d-flex justify-content-between text-success">
                  <span>Promotional Discount:</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4">
              <span className="fw-bold text-white fs-5">Final Payable:</span>
              <span className="fw-extrabold text-danger fs-3">${finalAmount.toFixed(2)}</span>
            </div>

            <button
              type="button"
              disabled={processing || !termsAgreed}
              onClick={handleCompletePayment}
              className="btn btn-cinema w-100 py-3 fw-bold fs-6 d-flex align-items-center justify-content-center gap-2"
            >
              {processing ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" />
                  Verifying Transaction...
                </>
              ) : (
                <>
                  <IconShield size={18} />
                  Authorize & Book Tickets (${finalAmount.toFixed(2)})
                </>
              )}
            </button>

            <div className="d-flex align-items-center justify-content-center gap-2 text-white-50 small mt-3" style={{ fontSize: '0.75rem' }}>
              <IconShield size={14} className="text-success" />
              <span>TLS 256-bit Encrypted Checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
