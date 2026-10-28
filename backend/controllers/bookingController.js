const Booking = require("../models/Booking");
const BookingService = require("../services/bookingService");
const ApiResponse = require("../utils/apiResponse");

const bookingController = {
  // POST /api/bookings
  createBooking: async (req, res, next) => {
    try {
      const { showId, seatIdentifiers, selectedSeats, couponCode } = req.body;
      const booking = await BookingService.createBooking({
        userId: req.user._id,
        showId,
        seatIdentifiers: seatIdentifiers || selectedSeats,
        couponCode
      });

      return ApiResponse.success(
        res,
        "Booking created and seats held. Please complete payment within 10 minutes.",
        { booking: booking.toJSON() },
        201
      );
    } catch (error) {
      const status = error.statusCode || 400;
      return ApiResponse.error(res, error.message, [], status);
    }
  },

  // POST /api/bookings/verify-coupon
  verifyCoupon: async (req, res, next) => {
    try {
      const { couponCode, subtotal } = req.body;
      const result = BookingService.calculateCouponDiscount(couponCode, Number(subtotal) || 0);
      return ApiResponse.success(res, "Coupon verified successfully", result);
    } catch (error) {
      const status = error.statusCode || 400;
      return ApiResponse.error(res, error.message, [], status);
    }
  },

  // GET /api/bookings/my & /api/bookings/my-bookings
  getMyBookings: async (req, res, next) => {
    try {
      const bookings = await BookingService.getUserBookings(req.user._id);
      return ApiResponse.success(res, "Bookings retrieved successfully", {
        bookings,
        total: bookings.length
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/bookings/:id
  getBookingById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const isAdmin = req.user.role === "admin";
      const booking = await BookingService.getBookingById(id, req.user._id, isAdmin);

      return ApiResponse.success(res, "Booking retrieved successfully", {
        booking
      });
    } catch (error) {
      const status = error.statusCode || 404;
      return ApiResponse.error(res, error.message, [], status);
    }
  },

  // POST /api/bookings/:id/cancel
  cancelBooking: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const isAdmin = req.user.role === "admin";

      const cancelledBooking = await BookingService.cancelBooking({
        bookingId: id,
        userId: req.user._id,
        isAdmin,
        reason: reason || "Cancelled by user"
      });

      return ApiResponse.success(
        res,
        "Booking cancelled successfully. Seats have been released.",
        { booking: cancelledBooking }
      );
    } catch (error) {
      const status = error.statusCode || 400;
      return ApiResponse.error(res, error.message, [], status);
    }
  },

  // Admin: GET /api/admin/bookings
  getAllBookingsAdmin: async (req, res, next) => {
    try {
      const { status, page = 1, limit = 50 } = req.query;
      const filter = {};
      if (status && status !== "all") {
        filter.bookingStatus = status;
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      const [bookings, total] = await Promise.all([
        Booking.find(filter)
          .populate("user", "name email phone")
          .populate("movie", "title posterUrl")
          .populate("theatre", "name city")
          .populate("screen", "name")
          .populate("show", "date time")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        Booking.countDocuments(filter)
      ]);

      return ApiResponse.success(res, "All bookings retrieved successfully", {
        bookings: bookings.map((b) => b.toJSON()),
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = bookingController;
