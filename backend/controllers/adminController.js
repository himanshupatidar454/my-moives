const Movie = require("../models/Movie");
const Theatre = require("../models/Theatre");
const Show = require("../models/Show");
const Booking = require("../models/Booking");
const User = require("../models/User");
const Review = require("../models/Review");
const ApiResponse = require("../utils/apiResponse");
const escapeRegex = require("../utils/escapeRegex");

const adminController = {
  // GET /api/admin/stats
  getDashboardStats: async (req, res, next) => {
    try {
      const [
        totalMovies,
        totalTheatres,
        upcomingShows,
        totalBookings,
        registeredUsers,
        revenueAgg
      ] = await Promise.all([
        Movie.countDocuments(),
        Theatre.countDocuments({ status: "active" }),
        Show.countDocuments({ startTime: { $gt: new Date() }, status: { $ne: "cancelled" } }),
        Booking.countDocuments({ bookingStatus: { $ne: "cancelled" } }),
        User.countDocuments({ role: "user" }),
        Booking.aggregate([
          { $match: { bookingStatus: "confirmed", paymentStatus: "paid" } },
          { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }
        ])
      ]);

      const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

      // Calculate 6-month trends
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);

      const monthlyBookings = await Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: sixMonthsAgo },
            bookingStatus: { $in: ["confirmed", "pending"] }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            bookings: { $sum: 1 },
            revenue: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0]
              }
            }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]);

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const trends = monthlyBookings.map((m) => ({
        month: monthNames[m._id.month - 1],
        bookings: m.bookings,
        revenue: Math.round(m.revenue * 100) / 100
      }));

      return ApiResponse.success(res, "Dashboard analytics retrieved successfully", {
        stats: {
          totalMovies,
          totalTheatres,
          upcomingShows,
          totalBookings,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          registeredUsers
        },
        trends
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/admin/reports
  getReports: async (req, res, next) => {
    try {
      // Top movies by revenue
      const topMovies = await Booking.aggregate([
        { $match: { bookingStatus: "confirmed", paymentStatus: "paid" } },
        {
          $group: {
            _id: "$movie",
            bookingsCount: { $sum: 1 },
            totalRevenue: { $sum: "$totalAmount" },
            ticketsSold: { $sum: { $size: "$seats" } }
          }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "movies",
            localField: "_id",
            foreignField: "_id",
            as: "movieDetails"
          }
        },
        { $unwind: "$movieDetails" },
        {
          $project: {
            movieId: "$_id",
            title: "$movieDetails.title",
            posterUrl: "$movieDetails.posterUrl",
            bookingsCount: 1,
            totalRevenue: 1,
            ticketsSold: 1
          }
        }
      ]);

      // Bookings grouped by theatre
      const theatreBreakdown = await Booking.aggregate([
        { $match: { bookingStatus: "confirmed" } },
        {
          $group: {
            _id: "$theatre",
            bookings: { $sum: 1 },
            revenue: { $sum: "$totalAmount" }
          }
        },
        {
          $lookup: {
            from: "theatres",
            localField: "_id",
            foreignField: "_id",
            as: "theatreDetails"
          }
        },
        { $unwind: "$theatreDetails" },
        {
          $project: {
            theatreId: "$_id",
            theatreName: "$theatreDetails.name",
            city: "$theatreDetails.city",
            bookings: 1,
            revenue: 1
          }
        }
      ]);

      return ApiResponse.success(res, "Reports generated successfully", {
        topMovies,
        theatreBreakdown,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/admin/users
  getUsers: async (req, res, next) => {
    try {
      const { search, role, status, page = 1, limit = 50 } = req.query;
      const filter = {};

      if (search && search.trim()) {
        const q = escapeRegex(search.trim());
        filter.$or = [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } }
        ];
      }

      if (role && role !== "all") {
        filter.role = role;
      }

      if (status && status !== "all") {
        filter.status = status;
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      const [users, total] = await Promise.all([
        User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
        User.countDocuments(filter)
      ]);

      return ApiResponse.success(res, "Users retrieved successfully", {
        users: users.map((u) => u.toJSON()),
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/admin/users/:id
  getUserById: async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return ApiResponse.error(res, "User not found", [], 404);
      }
      return ApiResponse.success(res, "User retrieved successfully", {
        user: user.toJSON()
      });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/admin/users/:id/status
  toggleUserStatus: async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return ApiResponse.error(res, "User not found", [], 404);
      }

      const body = req.body || {};
      const nextStatus = body.status || (user.status === "active" ? "inactive" : "active");
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        { status: nextStatus },
        { returnDocument: "after", runValidators: true }
      );

      return ApiResponse.success(res, `User status updated to ${updatedUser.status}`, {
        user: updatedUser.toJSON()
      });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/admin/reviews/:id/status
  moderateReview: async (req, res, next) => {
    try {
      const body = req.body || {};
      const status = body.status;
      if (!["approved", "pending", "rejected"].includes(status)) {
        return ApiResponse.error(res, "Status must be 'approved', 'pending', or 'rejected'", [], 422);
      }

      const review = await Review.findByIdAndUpdate(
        req.params.id,
        { status },
        { returnDocument: "after" }
      );

      if (!review) {
        return ApiResponse.error(res, "Review not found", [], 404);
      }

      await Review.calculateAverageRating(review.movie);

      return ApiResponse.success(res, `Review moderation status set to ${status}`, {
        review: review.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = adminController;
