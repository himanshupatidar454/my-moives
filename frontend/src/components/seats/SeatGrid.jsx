import React from 'react';

export const SeatGrid = ({ seatRows, selectedSeats, onToggleSeat }) => {
  return (
    <div className="seat-grid-wrapper overflow-x-auto py-2 px-1 text-center">
      <div className="d-inline-block text-center" style={{ minWidth: '600px' }}>
        {seatRows.map((rowObj) => {
          const isVip = rowObj.type === 'vip';
          const isPremium = rowObj.type === 'premium';

          return (
            <div key={rowObj.row} className="d-flex align-items-center justify-content-center gap-1 mb-2">
              {/* Left Row Label */}
              <div
                className="fw-bold text-white-50 text-end pe-2"
                style={{ width: '32px', fontSize: '0.85rem' }}
              >
                {rowObj.row}
              </div>

              {/* Seat Buttons */}
              <div className="d-flex align-items-center gap-1">
                {rowObj.seats.map((seat, index) => {
                  const isSelected = selectedSeats.some((s) => s.id === seat.id);
                  const isUnavailable =
                    seat.status === 'occupied' ||
                    seat.status === 'reserved' ||
                    seat.status === 'booked' ||
                    seat.status === 'unavailable';

                  // Add spacing for aisle after seat 3 and seat 9
                  const addAisle = index === 2 || index === 8;

                  let extraClass = '';
                  if (isSelected) extraClass += ' selected';
                  if (isUnavailable) extraClass += ' occupied';
                  if (isVip || isPremium) extraClass += ' premium';

                  return (
                    <React.Fragment key={seat.id}>
                      <button
                        type="button"
                        disabled={isUnavailable}
                        onClick={() => onToggleSeat(seat)}
                        className={`seat-button ${extraClass}`}
                        title={`${seat.id} (${seat.type.toUpperCase()}) - ${isUnavailable ? 'Unavailable' : isSelected ? 'Selected' : 'Available'}`}
                        aria-label={`Seat ${seat.id}, ${seat.type}, ${isUnavailable ? 'unavailable' : isSelected ? 'selected' : 'available'}`}
                      >
                        {!isUnavailable && seat.number}
                      </button>
                      {addAisle && <div style={{ width: '18px' }} />}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Right Row Label */}
              <div
                className="fw-bold text-white-50 text-start ps-2"
                style={{ width: '32px', fontSize: '0.85rem' }}
              >
                {rowObj.row}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
