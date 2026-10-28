const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Show = require("../models/Show");
const ShowSeat = require("../models/ShowSeat");
const SeatService = require("./seatService");
const config = require("../config/env");
const {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ConflictError
} = require("../utils/errors");

let cleanupIntervalTimer = null;

class BookingService {
  /**
   * Starts periodic background task to clean up expired bookings.
   */
  static startPeriodicCleanup(intervalMs = 60000) {
    if (cleanupIntervalTimer) return cleanupIntervalTimer;
    cleanupIntervalTimer = setInterval(async () => {
      try {
        await BookingService.cleanupExpiredBookings();
      } catch (err) {
        console.error("[Booking Cleanup] Error expiring pending bookings:", err.message);
      }
    }, intervalMs);

    if (cleanupIntervalTimer.unref) {
      cleanupIntervalTimer.unref();
    }
    return cleanupIntervalTimer;
  }

  /**
   * Stops the periodic background cleanup task.
   */
  static stopPeriodicCleanup() {
    if (cleanupIntervalTimer) {
      clearInterval(cleanupIntervalTimer);
      cleanupIntervalTimer = null;
    }
  }

  /**
   * Validates and calculates discount for coupon codes server-side.
   */
  static calculateCouponDiscount(couponCode, subtotal) {
    if (!couponCode) {
      return { valid: false, discount: 0, couponCode: null, message: "No coupon provided" };
    }
    const normalized = String(couponCode).trim().toUpperCase();
    let discount = 0;
    let message = "";

    if (normalized === "IMOVIES5" || normalized === "SAVE5") {
      discount = Math.min(5.00, subtotal);
      message = "$5 discount applied";
    } else if (normalized === "PREMIERE10" || normalized === "WELCOME10") {
      discount = Math.round(subtotal * 0.10 * 100) / 100;
      message = "10% discount applied";
    } else if (normalized === "IMOVIES20" || normalized === "VIP20") {
      discount = Math.round(subtotal * 0.20 * 100) / 100;
      message = "20% discount applied";
    } else {
      throw new BadRequestError(`Invalid coupon code: '${couponCode}'`);
    }

    return {
      valid: true,
      couponCode: normalized,
      discount,
      message
    };
  }

  /**
   * Creates a new pending booking with server-calculated totals and atomic seat reservation.
   */
  static async createBooking({ userId, showId, seatIdentifiers, selectedSeats = [], couponCode }) {
    const seatsToBook = seatIdentifiers || selectedSeats;

    if (!Array.isArray(seatsToBook) || seatsToBook.length === 0) {
      throw new BadRequestError("Please select at least one seat to book");
    }

    if (!mongoose.Types.ObjectId.isValid(showId)) {
      throw new BadRequestError("Invalid show ID format");
    }

    const show = await Show.findById(showId)
      .populate("movie")
      .populate("theatre")
      .populate("screen");

    if (!show) {
      throw new NotFoundError("Show not found");
    }

    const maxSeats = show.maxSeatsPerBooking ?? 10;
    if (seatsToBook.length > maxSeats) {
      throw new BadRequestError(`You can book a maximum of ${maxSeats} seats per transaction`);
    }

    if (new Date(show.startTime) <= new Date()) {
      throw new BadRequestError("This show has already started or ended. Bookings are closed.");
    }

    // 1. Concurrency-safe atomic seat reservation
    const reservation = await SeatService.reserveSeats({
      showId: show._id,
      seatIdentifiers: seatsToBook,
      userId,
      holdMinutes: config.reservationHoldMinutes
    });

    try {
      // 2. Server-side authoritative price calculation (never trust frontend totals)
      const seatsDetail = reservation.reservedSeats.map((s) => ({
        seatIdentifier: s.seatIdentifier,
        row: s.row,
        number: s.seatNumber,
        seatType: s.seatType,
        price: s.price
      }));

      const ticketSubtotal = seatsDetail.reduce((sum, item) => sum + item.price, 0);
      const ticketFee = show.ticketFee ?? 1.50;
      const fees = Math.round(seatsToBook.length * ticketFee * 100) / 100;
      let discount = 0.0;
      let appliedCouponCode = null;

      if (couponCode) {
        const couponResult = BookingService.calculateCouponDiscount(couponCode, ticketSubtotal);
        discount = couponResult.discount;
        appliedCouponCode = couponResult.couponCode;
      }

      const totalAmount = Math.max(0, Math.round((ticketSubtotal + fees - discount) * 100) / 100);

      // 3. Create pending booking record with retry on duplicate-key collision
      let booking;
      const MAX_RETRIES = 3;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const bookingReference = Booking.generateReference
            ? Booking.generateReference()
            : undefined;

          booking = await Booking.create({
            ...(bookingReference ? { bookingReference } : {}),
            user: userId,
            show: show._id,
            movie: show.movie._id,
            theatre: show.theatre._id,
            screen: show.screen._id,
            seats: seatsDetail,
            selectedSeats: seatsToBook,
            ticketSubtotal,
            fees,
            discount,
            couponCode: appliedCouponCode,
            totalAmount,
            bookingStatus: "pending",
            paymentStatus: "unpaid",
            expiresAt: reservation.expiresAt,
            qrCodeData: `IMOVIES-TICKET-${Date.now()}-${seatsToBook.join("-")}`
          });
          break;
        } catch (dbErr) {
          if (dbErr.code === 11000 && attempt < MAX_RETRIES - 1) {
            continue;
          }
          throw dbErr;
        }
      }

      // 4. Associate booking reference with the held ShowSeat records
      await ShowSeat.updateMany(
        {
          show: show._id,
          seatIdentifier: { $in: seatsToBook }
        },
        {
          $set: { booking: booking._id }
        }
      );

      return booking;
    } catch (error) {
      // If booking creation fails after seats are reserved, release the seats!
      await SeatService.releaseSeats({
        showId: show._id,
        seatIdentifiers: seatsToBook
      });
      throw error;
    }
  }

  /**
   * Retrieves bookings for a specific user without running heavy cross-table cleanup on every request.
   */
  static async getUserBookings(userId) {
    const bookings = await Booking.find({ user: userId })
      .populate("movie", "title posterUrl durationMinutes genres rating")
      .populate("theatre", "name city address")
      .populate("screen", "name screenType")
      .populate("show", "startTime endTime date time format language")
      .sort({ createdAt: -1 });

    return bookings.map((b) => b.toJSON());
  }

  /**
   * Retrieves single booking by ID or reference with ownership check.
   */
  static async getBookingById(bookingId, userId, isAdmin = false) {
    let query = {};
    if (mongoose.Types.ObjectId.isValid(bookingId)) {
      query._id = bookingId;
    } else {
      query.bookingReference = bookingId;
    }

    const booking = await Booking.findOne(query)
      .populate("movie")
      .populate("theatre")
      .populate("screen")
      .populate("show");

    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    if (!isAdmin && booking.user.toString() !== userId.toString()) {
      throw new ForbiddenError("Unauthorized: you cannot view another user's booking");
    }

    // Lazy expiration check for this individual booking
    if (booking.bookingStatus === "pending" && new Date(booking.expiresAt) < new Date()) {
      booking.bookingStatus = "expired";
      await booking.save();
      await SeatService.releaseSeats({
        showId: booking.show._id,
        seatIdentifiers: booking.selectedSeats,
        bookingId: booking._id
      });
    }

    return booking.toJSON();
  }

  /**
   * Cancels eligible booking and safely releases seats.
   * Only marks refunded when it was actually paid; pending/unpaid bookings have refundAmount 0.
   */
  static async cancelBooking({ bookingId, userId, isAdmin = false, reason = "Cancelled by user" }) {
    let query = {};
    if (mongoose.Types.ObjectId.isValid(bookingId)) {
      query._id = bookingId;
    } else {
      query.bookingReference = bookingId;
    }

    const booking = await Booking.findOne(query).populate("show");
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    if (!isAdmin && booking.user.toString() !== userId.toString()) {
      throw new ForbiddenError("Unauthorized: you cannot cancel this booking");
    }

    if (booking.bookingStatus === "cancelled") {
      throw new BadRequestError("Booking is already cancelled");
    }

    if (booking.bookingStatus === "expired") {
      throw new BadRequestError("Booking has already expired");
    }

    // Check showtime eligibility
    if (booking.show && new Date(booking.show.startTime) <= new Date()) {
      throw new BadRequestError("Cannot cancel a booking for a show that has already started or completed");
    }

    // Release seats
    await SeatService.releaseSeats({
      showId: booking.show._id || booking.show,
      seatIdentifiers: booking.selectedSeats,
      bookingId: booking._id
    });

    const wasPaid = booking.paymentStatus === "paid";

    booking.bookingStatus = "cancelled";
    booking.paymentStatus = wasPaid ? "refunded" : "unpaid";
    booking.cancellationDetails = {
      reason,
      cancelledAt: new Date(),
      refundAmount: wasPaid ? booking.totalAmount : 0
    };

    await booking.save();
    return booking.toJSON();
  }

  /**
   * Cleans up expired pending bookings across the system.
   */
  static async cleanupExpiredBookings() {
    const now = new Date();
    const expiredBookings = await Booking.find({
      bookingStatus: "pending",
      expiresAt: { $lt: now }
    });

    for (const b of expiredBookings) {
      b.bookingStatus = "expired";
      await b.save();
      await SeatService.releaseSeats({
        showId: b.show,
        seatIdentifiers: b.selectedSeats,
        bookingId: b._id
      });
    }
    return expiredBookings.length;
  }
}

module.exports = BookingService;
