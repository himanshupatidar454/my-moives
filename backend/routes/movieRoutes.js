const express = require("express");
const { body } = require("express-validator");
const movieController = require("../controllers/movieController");
const showController = require("../controllers/showController");
const reviewController = require("../controllers/reviewController");
const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");

const router = express.Router();

const updateMovieValidation = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Movie title cannot be empty")
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),
  body("synopsis")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Synopsis cannot be empty"),
  body("posterUrl")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Poster URL cannot be empty"),
  body("backdropUrl")
    .optional()
    .trim(),
  body("language")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Language cannot be empty"),
  body("durationMinutes")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Duration in minutes must be an integer of at least 1"),
  body("duration")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Duration must be an integer of at least 1"),
  body("releaseDate")
    .optional()
    .isISO8601()
    .withMessage("Release date must be a valid ISO8601 date string"),
  body("releaseStatus")
    .optional()
    .customSanitizer((v) => (typeof v === "string" ? v.replace("_", "-") : v))
    .isIn(["now-showing", "coming-soon", "archived"])
    .withMessage("Release status must be 'now-showing', 'coming-soon', or 'archived'"),
  body("status")
    .optional()
    .customSanitizer((v) => (typeof v === "string" ? v.replace("_", "-") : v))
    .isIn(["now-showing", "coming-soon", "archived"])
    .withMessage("Status must be 'now-showing', 'coming-soon', or 'archived'"),
  body("director")
    .optional()
    .trim(),
  body("cast")
    .optional()
    .isArray()
    .withMessage("Cast must be an array of strings"),
  body("crew")
    .optional()
    .isArray()
    .withMessage("Crew must be an array of strings"),
  body("formats")
    .optional()
    .isArray()
    .withMessage("Formats must be an array of strings"),
  body("featured")
    .optional()
    .isBoolean()
    .withMessage("Featured must be a boolean value")
];

// Specific routes before param :id
router.get("/featured", movieController.getFeaturedMovies);
router.get("/now-showing", movieController.getNowShowing);
router.get("/coming-soon", movieController.getComingSoon);

// Shows for movie
router.get("/:movieId/shows", (req, res, next) => {
  req.query.movieId = req.params.movieId;
  return showController.getShows(req, res, next);
});

// Reviews for movie
router.get("/:movieId/reviews", reviewController.getMovieReviews);
router.post("/:movieId/reviews", authenticate, reviewController.submitReview);

// General listings and by ID/slug
router.get("/", movieController.getMovies);
router.get("/:id", movieController.getMovieById);

// Admin operations (also accessible via /api/movies directly)
router.post("/", authenticate, authorize("admin"), movieController.createMovie);
router.put("/:id", authenticate, authorize("admin"), updateMovieValidation, validate, movieController.updateMovie);
router.patch("/:id", authenticate, authorize("admin"), updateMovieValidation, validate, movieController.updateMovie);
router.delete("/:id", authenticate, authorize("admin"), movieController.deleteMovie);

module.exports = router;
module.exports.updateMovieValidation = updateMovieValidation;
