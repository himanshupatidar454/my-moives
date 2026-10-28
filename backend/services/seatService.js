const mongoose = require("mongoose");
const Show = require("../models/Show");
const Screen = require("../models/Screen");
const ShowSeat = require("../models/ShowSeat");
const { broadcastSeatUpdate } = require("../utils/socket");
const config = require("../config/env");
const {
  BadRequestError,
  NotFoundError,
  ConflictError
} = require("../utils/errors");

class SeatService {
  /**
   * Initializes seat documents for a show from its Screen layout if not already generated.
   */
  static async initializeShowSeats(showId) {
    const show = await Show.findById(showId).populate("screen");
    if (!show) {
      throw new NotFoundError("Show not found");
    }

    const existingCount = await ShowSeat.countDocuments({ show: showId });
    if (existingCount > 0) {
      return;
    }

    let seatLayout = show.screen?.seatLayout;
    if (!seatLayout || !Array.isArray(seatLayout) || seatLayout.length === 0) {
      // Default fallback layout if screen has no layout
      const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "J"];
      seatLayout = rows.map((r, idx) => ({
        row: r,
        type: idx >= 7 ? "vip" : idx >= 5 ? "premium" : "standard",
        seats: Array.from({ length: 12 }, (_, i) => ({ number: i + 1, seatCode: `${r}${i + 1}` }))
      }));
    }

    const seatDocs = [];
    for (const rowData of seatLayout) {
      const rowLabel = rowData.row;
      const rowType = rowData.type || "standard";
      const seatPrice =
        rowType === "vip"
          ? show.vipPrice || show.standardPrice * 1.6
          : rowType === "premium"
          ? show.premiumPrice
          : show.standardPrice;

      for (const seat of rowData.seats) {
        const seatNum = seat.number;
        const seatId = seat.seatCode || `${rowLabel}${seatNum}`;

        seatDocs.push({
          show: show._id,
          seatIdentifier: seatId,
          row: rowLabel,
          seatNumber: seatNum,
          seatType: rowType,
          price: seatPrice,
          status: "available"
        });
      }
    }

    try {
      await ShowSeat.insertMany(seatDocs, { ordered: false });
    } catch (err) {
      // Ignore duplicate key errors if created concurrently
      if (err.code !== 11000) {
        throw err;
      }
    }
  }

  /**
   * Lazily clears expired seat holds for a given show.
   */
  static async cleanupExpiredReservations(showId) {
    const now = new Date();
    const expiredSeats = await ShowSeat.find({
      show: showId,
      status: "reserved",
      reservationExpiresAt: { $lt: now }
    });

    if (expiredSeats.length > 0) {
      const expiredIds = expiredSeats.map((s) => s.seatIdentifier);
      await ShowSeat.updateMany(
        {
          show: showId,
          seatIdentifier: { $in: expiredIds },
          status: "reserved",
          reservationExpiresAt: { $lt: now }
        },
        {
          $set: {
            status: "available",
            reservedBy: null,
            reservationExpiresAt: null,
            booking: null
          }
        }
      );

      broadcastSeatUpdate(showId.toString(), {
        seats: expiredIds.map((id) => ({ id, status: "available" }))
      });
    }
  }

  /**
   * Retrieves interactive seat layout for the frontend seat grid.
   */
  static async getSeatLayout(showId) {
    await this.initializeShowSeats(showId);
    await this.cleanupExpiredReservations(showId);

    const show = await Show.findById(showId);
    if (!show) {
      throw new NotFoundError("Show not found");
    }

    const showSeats = await ShowSeat.find({ show: showId }).sort({ row: 1, seatNumber: 1 });

    // Group seats by row
    const rowMap = new Map();
    for (const seat of showSeats) {
      if (!rowMap.has(seat.row)) {
        rowMap.set(seat.row, {
          row: seat.row,
          type: seat.seatType,
          seats: []
        });
      }
      rowMap.get(seat.row).seats.push({
        id: seat.seatIdentifier,
        row: seat.row,
        number: seat.seatNumber,
        type: seat.seatType,
        price: seat.price,
        // Frontend expects 'occupied' for booked seats
        status: seat.status === "booked" ? "occupied" : seat.status
      });
    }

    return Array.from(rowMap.values());
  }

  /**
   * Concurrency-safe atomic seat reservation.
   * Prevents two users from reserving the same seat simultaneously.
   */
  static async reserveSeats({ showId, seatIdentifiers, userId, holdMinutes = config.reservationHoldMinutes }) {
    if (!seatIdentifiers || seatIdentifiers.length === 0) {
      throw new BadRequestError("At least one seat must be selected");
    }

    await this.initializeShowSeats(showId);
    await this.cleanupExpiredReservations(showId);

    const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);
    const successfullyReserved = [];

    try {
      for (const seatId of seatIdentifiers) {
        const reservedSeat = await ShowSeat.findOneAndUpdate(
          {
            show: showId,
            seatIdentifier: seatId,
            $or: [
              { status: "available" },
              { status: "reserved", reservationExpiresAt: { $lt: new Date() } }
            ]
          },
          {
            $set: {
              status: "reserved",
              reservedBy: userId,
              reservationExpiresAt: expiresAt
            }
          },
          { returnDocument: "after" }
        );

        if (!reservedSeat) {
          throw new ConflictError(`Seat '${seatId}' is no longer available. Please choose another seat.`);
        }

        successfullyReserved.push(reservedSeat);
      }

      // Broadcast update to other viewers via Socket.IO
      broadcastSeatUpdate(showId.toString(), {
        seats: seatIdentifiers.map((id) => ({ id, status: "reserved" }))
      });

      return {
        success: true,
        reservedSeats: successfullyReserved,
        expiresAt
      };
    } catch (error) {
      // Rollback any seats partially reserved during this atomic request
      if (successfullyReserved.length > 0) {
        const rollbackIds = successfullyReserved.map((s) => s.seatIdentifier);
        await ShowSeat.updateMany(
          {
            show: showId,
            seatIdentifier: { $in: rollbackIds },
            reservedBy: userId
          },
          {
            $set: {
              status: "available",
              reservedBy: null,
              reservationExpiresAt: null
            }
          }
        );
      }
      throw error;
    }
  }

  /**
   * Atomically confirms seats when booking payment is verified.
   */
  static async confirmSeats({ showId, seatIdentifiers, bookingId }) {
    await ShowSeat.updateMany(
      {
        show: showId,
        seatIdentifier: { $in: seatIdentifiers }
      },
      {
        $set: {
          status: "booked",
          booking: bookingId,
          reservationExpiresAt: null
        }
      }
    );

    broadcastSeatUpdate(showId.toString(), {
      seats: seatIdentifiers.map((id) => ({ id, status: "occupied" }))
    });
  }

  /**
   * Releases seats upon cancellation or booking failure.
   */
  static async releaseSeats({ showId, seatIdentifiers, bookingId = null }) {
    const query = {
      show: showId,
      seatIdentifier: { $in: seatIdentifiers }
    };
    if (bookingId) {
      query.booking = bookingId;
    }

    await ShowSeat.updateMany(query, {
      $set: {
        status: "available",
        reservedBy: null,
        reservationExpiresAt: null,
        booking: null
      }
    });

    broadcastSeatUpdate(showId.toString(), {
      seats: seatIdentifiers.map((id) => ({ id, status: "available" }))
    });
  }
}

module.exports = SeatService;
