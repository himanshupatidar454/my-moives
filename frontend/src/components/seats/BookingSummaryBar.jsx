import React from 'react';
import { IconTicket, IconSparkles } from '../common/Icons';

export const BookingSummaryBar = ({
  movie,
  theatre,
  show,
  date,
  selectedSeats,
  subtotal,
  bookingFee,
  total,
  onProceed
}) => {
  const seatCount = selectedSeats.length;

  return (
    <div
      className="p-4 rounded-4 shadow-lg"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-strong)'
      }}
    >
      <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom border-secondary border-opacity-25">
        <h5 className="fw-bold mb-0 text-white d-flex align-items-center gap-2">
          <IconTicket size={20} className="text-danger" />
          Booking Summary
        </h5>
        <span className="badge bg-danger rounded-pill px-3 py-1" style={{ fontSize: '0.75rem' }}>
          {seatCount} {seatCount === 1 ? 'Seat' : 'Seats'} Selected
        </span>
      </div>

      {/* Selected Movie & Theatre details */}
      <div className="mb-3">
        <h6 className="fw-bold text-white mb-1">{movie?.title}</h6>
        <p className="text-white-50 small mb-1">{theatre?.name} • {theatre?.city}</p>
        <p className="text-white-50 small mb-0">
          <span className="badge bg-dark border border-secondary text-white-50 me-2">{show?.format}</span>
          <span>{date?.label || date}</span> • <span className="text-white fw-medium">{show?.time}</span>
        </p>
      </div>

      {/* Seats Breakdown */}
      <div className="p-3 rounded-3 mb-3" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span className="text-white-50 small">Selected Seats:</span>
          <span className="text-white fw-bold">
            {seatCount > 0 ? selectedSeats.map((s) => s.id).join(', ') : 'None'}
          </span>
        </div>

        <div className="d-flex justify-content-between align-items-center text-white-50 small mb-1">
          <span>Ticket Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>

        <div className="d-flex justify-content-between align-items-center text-white-50 small">
          <span>Convenience & Booking Fee:</span>
          <span>${bookingFee.toFixed(2)}</span>
        </div>

        <hr className="border-secondary border-opacity-25 my-2" />

        <div className="d-flex justify-content-between align-items-center">
          <span className="fw-bold text-white">Total Amount:</span>
          <span className="fw-bold text-danger fs-5">${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Disclaimers & Action */}
      <p className="text-white-50 small mb-3" style={{ fontSize: '0.75rem' }}>
        <IconSparkles size={12} className="text-warning me-1" />
        Seats are held upon proceeding to checkout and confirmed once payment verification completes.
      </p>

      <button
        type="button"
        disabled={seatCount === 0}
        onClick={onProceed}
        className="btn btn-cinema w-100 py-3 fw-bold"
      >
        {seatCount === 0 ? 'Select at least 1 seat' : `Proceed to Checkout • $${total.toFixed(2)}`}
      </button>
    </div>
  );
};
