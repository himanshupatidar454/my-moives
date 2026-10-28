const mongoose = require("mongoose");
const Theatre = require("../models/Theatre");
const Screen = require("../models/Screen");
const ApiResponse = require("../utils/apiResponse");
const escapeRegex = require("../utils/escapeRegex");

const theatreController = {
  // GET /api/theatres
  getTheatres: async (req, res, next) => {
    try {
      const { city } = req.query;
      const filter = { status: "active" };

      if (city && city !== "All") {
        const escapedCity = escapeRegex(city.trim());
        filter.city = new RegExp(`^${escapedCity}$`, "i");
      }

      const theatres = await Theatre.find(filter).sort({ name: 1 });
      const formattedTheatres = theatres.map((t) => t.toJSON());

      return ApiResponse.success(res, "Theatres retrieved successfully", {
        theatres: formattedTheatres,
        total: formattedTheatres.length
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/theatres/:id
  getTheatreById: async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return ApiResponse.error(res, "Invalid theatre ID format", [], 400);
      }

      const theatre = await Theatre.findById(id);
      if (!theatre) {
        return ApiResponse.error(res, "Theatre not found", [], 404);
      }

      return ApiResponse.success(res, "Theatre retrieved successfully", {
        theatre: theatre.toJSON()
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/theatres/:id/screens
  getTheatreScreens: async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return ApiResponse.error(res, "Invalid theatre ID format", [], 400);
      }

      const screens = await Screen.find({ theatre: id, status: "active" });
      return ApiResponse.success(res, "Screens retrieved successfully", {
        screens: screens.map((s) => s.toJSON())
      });
    } catch (error) {
      next(error);
    }
  },

  // Admin: POST /api/theatres
  createTheatre: async (req, res, next) => {
    try {
      const { name, address, city, amenities, screensCount, rating } = req.body;

      if (!name || !address || !city) {
        return ApiResponse.error(res, "Name, address, and city are required", [], 422);
      }

      const newTheatre = await Theatre.create({
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        amenities: Array.isArray(amenities) ? amenities : undefined,
        screensCount: Number(screensCount) || 4,
        rating: Number(rating) || 4.8
      });

      // Automatically initialize default screens for this theatre
      const count = Number(screensCount) || 4;
      const screenTypes = ["IMAX", "Dolby Atmos", "Standard", "2D 4K"];
      for (let i = 1; i <= count; i++) {
        await Screen.create({
          theatre: newTheatre._id,
          name: `Screen ${i} - ${screenTypes[(i - 1) % screenTypes.length]}`,
          screenType: screenTypes[(i - 1) % screenTypes.length]
        });
      }

      return ApiResponse.success(
        res,
        "Theatre and screens created successfully",
        { theatre: newTheatre.toJSON() },
        201
      );
    } catch (error) {
      next(error);
    }
  },

  // Admin: PUT/PATCH /api/theatres/:id
  updateTheatre: async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return ApiResponse.error(res, "Invalid theatre ID format", [], 400);
      }

      // Explicit allow-list of editable fields
      const ALLOWED_FIELDS = [
        "name",
        "address",
        "city",
        "amenities",
        "screensCount",
        "rating",
        "status"
      ];

      const updates = {};
      for (const field of ALLOWED_FIELDS) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      const updated = await Theatre.findByIdAndUpdate(id, updates, {
        returnDocument: "after",
        runValidators: true
      });

      if (!updated) {
        return ApiResponse.error(res, "Theatre not found", [], 404);
      }

      return ApiResponse.success(res, "Theatre updated successfully", {
        theatre: updated.toJSON()
      });
    } catch (error) {
      next(error);
    }
  },

  // Admin: DELETE /api/theatres/:id
  deleteTheatre: async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return ApiResponse.error(res, "Invalid theatre ID format", [], 400);
      }

      const theatre = await Theatre.findById(id);
      if (!theatre) {
        return ApiResponse.error(res, "Theatre not found", [], 404);
      }

      const Show = require("../models/Show");
      const Booking = require("../models/Booking");

      // Block delete if future shows or confirmed bookings exist to prevent orphaned data
      const now = new Date();
      const [futureShowsCount, confirmedBookingsCount] = await Promise.all([
        Show.countDocuments({
          theatre: id,
          startTime: { $gt: now },
          status: { $ne: "cancelled" }
        }),
        Booking.countDocuments({
          theatre: id,
          bookingStatus: "confirmed"
        })
      ]);

      if (futureShowsCount > 0 || confirmedBookingsCount > 0) {
        return ApiResponse.error(
          res,
          `Cannot delete theatre with ${futureShowsCount} upcoming show(s) or ${confirmedBookingsCount} confirmed booking(s). Mark the theatre inactive instead.`,
          [],
          400
        );
      }

      await Theatre.findByIdAndDelete(id);
      // Cleanup associated screens
      await Screen.deleteMany({ theatre: id });

      return ApiResponse.success(res, "Theatre and screens deleted successfully", {
        id: theatre._id.toString()
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = theatreController;
