const mongoose = require("mongoose");
const Show = require("../models/Show");
const Movie = require("../models/Movie");
const Theatre = require("../models/Theatre");
const Screen = require("../models/Screen");
const SeatService = require("../services/seatService");
const ApiResponse = require("../utils/apiResponse");

const showController = {
  // GET /api/shows
  getShows: async (req, res, next) => {
    try {
      const { movieId, city, date } = req.query;

      const query = { status: { $ne: "cancelled" } };

      if (movieId) {
        if (mongoose.Types.ObjectId.isValid(movieId)) {
          query.movie = movieId;
        } else {
          const foundMovie = await Movie.findOne({ slug: movieId });
          if (foundMovie) {
            query.movie = foundMovie._id;
          }
        }
      }

      if (date) {
        query.date = date;
      }

      let shows = await Show.find(query)
        .populate("movie", "title posterUrl durationMinutes genres rating")
        .populate("theatre", "name city address amenities rating")
        .populate("screen", "name screenType capacity")
        .sort({ startTime: 1 });

      if (shows.length === 0 && date && movieId) {
        const fallbackQuery = { ...query };
        delete fallbackQuery.date;
        shows = await Show.find(fallbackQuery)
          .populate("movie", "title posterUrl durationMinutes genres rating")
          .populate("theatre", "name city address amenities rating")
          .populate("screen", "name screenType capacity")
          .sort({ startTime: 1 });
      }

      // If requested for movie details, group by theatre
      if (movieId) {
        const theatreMap = new Map();

        for (const show of shows) {
          const th = show.theatre;
          if (!th) continue;

          if (city && city !== "All" && th.city.toLowerCase() !== city.toLowerCase()) {
            continue;
          }

          const thId = th._id.toString();
          if (!theatreMap.has(thId)) {
            theatreMap.set(thId, {
              theatre: th.toJSON(),
              shows: []
            });
          }

          theatreMap.get(thId).shows.push(show.toJSON());
        }

        const theatreShows = Array.from(theatreMap.values());
        return ApiResponse.success(res, "Shows retrieved successfully", {
          theatreShows,
          shows: shows.map((s) => s.toJSON()),
          total: shows.length
        });
      }

      // Flat listing for general use / admin
      return ApiResponse.success(res, "Shows retrieved successfully", {
        shows: shows.map((s) => s.toJSON()),
        total: shows.length
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/shows/:id
  getShowById: async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return ApiResponse.error(res, "Invalid show ID format", [], 400);
      }

      const show = await Show.findById(id)
        .populate("movie")
        .populate("theatre")
        .populate("screen");

      if (!show) {
        return ApiResponse.error(res, "Show not found", [], 404);
      }

      const showData = show.toJSON();
      const ticketFee = show.ticketFee ?? 1.50;
      const maxSeatsPerBooking = show.maxSeatsPerBooking ?? 10;
      const pricing = {
        standardPrice: show.standardPrice,
        premiumPrice: show.premiumPrice,
        vipPrice: show.vipPrice ?? 28.00,
        ticketFee,
        maxSeatsPerBooking
      };
      showData.ticketFee = ticketFee;
      showData.maxSeatsPerBooking = maxSeatsPerBooking;
      showData.pricing = pricing;

      return ApiResponse.success(res, "Show details retrieved successfully", {
        show: showData,
        pricing,
        ticketFee,
        maxSeatsPerBooking,
        standardPrice: show.standardPrice,
        premiumPrice: show.premiumPrice,
        vipPrice: show.vipPrice ?? 28.00
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/shows/:showId/seats
  getSeatLayout: async (req, res, next) => {
    try {
      const { showId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(showId)) {
        return ApiResponse.error(res, "Invalid show ID format", [], 400);
      }

      const show = await Show.findById(showId);
      if (!show) {
        return ApiResponse.error(res, "Show not found", [], 404);
      }

      const layout = await SeatService.getSeatLayout(showId);
      const ticketFee = show.ticketFee ?? 1.50;
      const maxSeatsPerBooking = show.maxSeatsPerBooking ?? 10;
      const pricing = {
        standardPrice: show.standardPrice,
        premiumPrice: show.premiumPrice,
        vipPrice: show.vipPrice ?? 28.00,
        ticketFee,
        maxSeatsPerBooking
      };

      return ApiResponse.success(res, "Seat layout retrieved successfully", {
        seatLayout: layout,
        pricing,
        ticketFee,
        maxSeatsPerBooking,
        standardPrice: show.standardPrice,
        premiumPrice: show.premiumPrice,
        vipPrice: show.vipPrice ?? 28.00
      });
    } catch (error) {
      next(error);
    }
  },

  // Admin: POST /api/shows
  createShow: async (req, res, next) => {
    try {
      const {
        movieId,
        movie: movieBody,
        theatreId,
        theatre: theatreBody,
        screenId,
        screen: screenBody,
        startTime,
        endTime,
        time,
        date,
        language,
        format,
        standardPrice,
        premiumPrice,
        vipPrice
      } = req.body;

      const selectedMovie = movieId || movieBody;
      const selectedTheatre = theatreId || theatreBody;
      const selectedScreen = screenId || screenBody;

      if (!selectedMovie || !selectedTheatre || !selectedScreen) {
        return ApiResponse.error(res, "Movie, theatre, and screen references are required", [], 422);
      }

      const [movieDoc, theatreDoc, screenDoc] = await Promise.all([
        Movie.findById(selectedMovie),
        Theatre.findById(selectedTheatre),
        Screen.findById(selectedScreen)
      ]);

      if (!movieDoc) {
        return ApiResponse.error(res, "Referenced movie does not exist", [], 404);
      }
      if (!theatreDoc) {
        return ApiResponse.error(res, "Referenced theatre does not exist", [], 404);
      }
      if (!screenDoc) {
        return ApiResponse.error(res, "Referenced screen does not exist", [], 404);
      }

      const start = new Date(startTime || Date.now());
      // Default end time is startTime + movie duration + 30 mins buffer
      const durationMs = (movieDoc.durationMinutes || 120) * 60 * 1000 + 30 * 60 * 1000;
      const end = endTime ? new Date(endTime) : new Date(start.getTime() + durationMs);

      if (start >= end) {
        return ApiResponse.error(res, "Show startTime must precede endTime", [], 422);
      }

      // Check for screen scheduling conflicts
      const hasConflict = await Show.hasScheduleConflict(screenDoc._id, start, end);
      if (hasConflict) {
        return ApiResponse.error(
          res,
          "Schedule conflict: The selected screen already has a show scheduled during this time window.",
          [{ field: "startTime", message: "Time overlap detected on this screen" }],
          409
        );
      }

      const showDate = date || start.toISOString().split("T")[0];
      const showTime =
        time ||
        start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

      const newShow = await Show.create({
        movie: movieDoc._id,
        theatre: theatreDoc._id,
        screen: screenDoc._id,
        screenName: screenDoc.name,
        startTime: start,
        endTime: end,
        time: showTime,
        date: showDate,
        language: language || movieDoc.language || "English",
        format: format || screenDoc.screenType || "2D 4K",
        standardPrice: Number(standardPrice) || 15.0,
        premiumPrice: Number(premiumPrice) || 22.0,
        vipPrice: Number(vipPrice) || 28.0
      });

      // Pre-initialize seat inventory
      await SeatService.initializeShowSeats(newShow._id);

      return ApiResponse.success(
        res,
        "Show scheduled and seats initialized successfully",
        { show: newShow.toJSON() },
        201
      );
    } catch (error) {
      next(error);
    }
  },

  // Admin: PUT/PATCH /api/shows/:id
  updateShow: async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return ApiResponse.error(res, "Invalid show ID format", [], 400);
      }

      // Explicit allow-list of editable fields
      const ALLOWED_FIELDS = [
        "movieId",
        "movie",
        "theatreId",
        "theatre",
        "screenId",
        "screen",
        "screenName",
        "startTime",
        "endTime",
        "time",
        "date",
        "language",
        "format",
        "standardPrice",
        "premiumPrice",
        "vipPrice",
        "status"
      ];

      const updates = {};
      for (const field of ALLOWED_FIELDS) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      // Map alias IDs to model references
      if (updates.movieId && !updates.movie) {
        updates.movie = updates.movieId;
        delete updates.movieId;
      }
      if (updates.theatreId && !updates.theatre) {
        updates.theatre = updates.theatreId;
        delete updates.theatreId;
      }
      if (updates.screenId && !updates.screen) {
        updates.screen = updates.screenId;
        delete updates.screenId;
      }

      const updated = await Show.findByIdAndUpdate(id, updates, {
        returnDocument: "after",
        runValidators: true
      });

      if (!updated) {
        return ApiResponse.error(res, "Show not found", [], 404);
      }

      return ApiResponse.success(res, "Show updated successfully", {
        show: updated.toJSON()
      });
    } catch (error) {
      next(error);
    }
  },

  // Admin: DELETE /api/shows/:id
  deleteShow: async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return ApiResponse.error(res, "Invalid show ID format", [], 400);
      }

      const show = await Show.findById(id);
      if (!show) {
        return ApiResponse.error(res, "Show not found", [], 404);
      }

      const Booking = require("../models/Booking");
      const ShowSeat = require("../models/ShowSeat");

      // Check if show has confirmed or paid bookings
      const paidOrConfirmedCount = await Booking.countDocuments({
        show: id,
        $or: [{ paymentStatus: "paid" }, { bookingStatus: "confirmed" }]
      });

      if (paidOrConfirmedCount > 0) {
        // Never delete seats of a show that has paid bookings
        return ApiResponse.error(
          res,
          `Cannot delete show with ${paidOrConfirmedCount} confirmed/paid booking(s). Please cancel the show instead.`,
          [],
          400
        );
      }

      await Show.findByIdAndDelete(id);

      // Cleanup show seats only when no paid/confirmed bookings exist
      await ShowSeat.deleteMany({ show: id });

      return ApiResponse.success(res, "Show and seat inventory deleted successfully", {
        id: show._id.toString()
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = showController;
