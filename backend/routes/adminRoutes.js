const express = require("express");
const adminController = require("../controllers/adminController");
const movieController = require("../controllers/movieController");
const theatreController = require("../controllers/theatreController");
const showController = require("../controllers/showController");
const bookingController = require("../controllers/bookingController");
const reviewController = require("../controllers/reviewController");
const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { updateMovieValidation } = require("./movieRoutes");
const { updateTheatreValidation } = require("./theatreRoutes");
const { updateShowValidation } = require("./showRoutes");

const router = express.Router();

// Enforce authentication & admin authorization on all /api/admin routes
router.use(authenticate, authorize("admin"));

// Dashboard & Reports
router.get("/stats", adminController.getDashboardStats);
router.get("/reports", adminController.getReports);

// User Management
router.get("/users", adminController.getUsers);
router.get("/users/:id", adminController.getUserById);
router.patch("/users/:id/status", adminController.toggleUserStatus);

// Booking Management
router.get("/bookings", bookingController.getAllBookingsAdmin);
router.get("/bookings/:id", bookingController.getBookingById);

// Review Moderation
router.get("/reviews", reviewController.getAllReviewsAdmin);
router.patch("/reviews/:id/status", adminController.moderateReview);
router.delete("/reviews/:id", reviewController.deleteReview);

// Movie Management
router.post("/movies", movieController.createMovie);
router.patch("/movies/:id", updateMovieValidation, validate, movieController.updateMovie);
router.put("/movies/:id", updateMovieValidation, validate, movieController.updateMovie);
router.delete("/movies/:id", movieController.deleteMovie);

// Theatre Management
router.post("/theatres", theatreController.createTheatre);
router.patch("/theatres/:id", updateTheatreValidation, validate, theatreController.updateTheatre);
router.put("/theatres/:id", updateTheatreValidation, validate, theatreController.updateTheatre);
router.delete("/theatres/:id", theatreController.deleteTheatre);

// Show Management
router.post("/shows", showController.createShow);
router.patch("/shows/:id", updateShowValidation, validate, showController.updateShow);
router.put("/shows/:id", updateShowValidation, validate, showController.updateShow);
router.delete("/shows/:id", showController.deleteShow);

module.exports = router;
