const mongoose = require("mongoose");
const Review = require("../models/Review");
const Movie = require("../models/Movie");
const Booking = require("../models/Booking");
const ApiResponse = require("../utils/apiResponse");

const reviewController = {
  // GET /api/movies/:movieId/reviews
  getMovieReviews: async (req, res, next) => {
    try {
      const { movieId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      let movie = null;
      if (mongoose.Types.ObjectId.isValid(movieId)) {
        movie = await Movie.findById(movieId);
      } else {
        movie = await Movie.findOne({ slug: movieId });
      }

      if (!movie) {
        return ApiResponse.error(res, "Movie not found", [], 404);
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      const [reviews, total] = await Promise.all([
        Review.find({ movie: movie._id, status: "approved" })
          .populate("user", "name avatar")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        Review.countDocuments({ movie: movie._id, status: "approved" })
      ]);

      return ApiResponse.success(res, "Reviews retrieved successfully", {
        reviews: reviews.map((r) => r.toJSON()),
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/movies/:movieId/reviews
  submitReview: async (req, res, next) => {
    try {
      const { movieId } = req.params;
      const { rating, comment, reviewText, content } = req.body;

      const parsedRating = Number(rating);
      if (!parsedRating || parsedRating < 1 || parsedRating > 10) {
        return ApiResponse.error(res, "Rating must be a number between 1 and 10", [], 422);
      }

      const text = reviewText || comment || content;
      if (!text || text.trim().length < 2) {
        return ApiResponse.error(res, "Review text must be at least 2 characters", [], 422);
      }

      let movie = null;
      if (mongoose.Types.ObjectId.isValid(movieId)) {
        movie = await Movie.findById(movieId);
      } else {
        movie = await Movie.findOne({ slug: movieId });
      }

      if (!movie) {
        return ApiResponse.error(res, "Movie not found", [], 404);
      }

      // Check if user has already reviewed this movie
      let review = await Review.findOne({
        user: req.user._id,
        movie: movie._id
      });

      // Check if user has booked this movie
      const hasBooking = await Booking.findOne({
        user: req.user._id,
        movie: movie._id,
        bookingStatus: "confirmed"
      });

      if (review) {
        // Update existing review
        review.rating = parsedRating;
        review.reviewText = text.trim();
        review.verifiedPurchase = Boolean(hasBooking);
        await review.save();
      } else {
        review = await Review.create({
          user: req.user._id,
          userName: req.user.name,
          userAvatar: req.user.avatar,
          movie: movie._id,
          rating: parsedRating,
          reviewText: text.trim(),
          verifiedPurchase: Boolean(hasBooking),
          status: "approved"
        });
      }

      // Recalculate movie average rating and review count
      await Review.calculateAverageRating(movie._id);

      return ApiResponse.success(
        res,
        "Review submitted successfully",
        { review: review.toJSON() },
        201
      );
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/reviews/:id
  updateReview: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { rating, comment, reviewText, content } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return ApiResponse.error(res, "Invalid review ID format", [], 400);
      }

      const review = await Review.findById(id);
      if (!review) {
        return ApiResponse.error(res, "Review not found", [], 404);
      }

      if (review.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        return ApiResponse.error(res, "Unauthorized to update this review", [], 403);
      }

      if (rating) {
        review.rating = Number(rating);
      }
      if (comment || reviewText || content) {
        review.reviewText = (reviewText || comment || content).trim();
      }

      await review.save();
      await Review.calculateAverageRating(review.movie);

      return ApiResponse.success(res, "Review updated successfully", {
        review: review.toJSON()
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/reviews/:id
  deleteReview: async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return ApiResponse.error(res, "Invalid review ID format", [], 400);
      }

      const review = await Review.findById(id);
      if (!review) {
        return ApiResponse.error(res, "Review not found", [], 404);
      }

      if (review.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        return ApiResponse.error(res, "Unauthorized to delete this review", [], 403);
      }

      const movieId = review.movie;
      await Review.findByIdAndDelete(id);
      await Review.calculateAverageRating(movieId);

      return ApiResponse.success(res, "Review deleted successfully", {
        id
      });
    } catch (error) {
      next(error);
    }
  },

  // Admin: GET /api/admin/reviews
  getAllReviewsAdmin: async (req, res, next) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      const [reviews, total] = await Promise.all([
        Review.find()
          .populate("user", "name email")
          .populate("movie", "title posterUrl")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        Review.countDocuments()
      ]);

      return ApiResponse.success(res, "All reviews retrieved successfully", {
        reviews: reviews.map((r) => r.toJSON()),
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = reviewController;
