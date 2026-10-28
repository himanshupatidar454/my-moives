const express = require("express");
const { body } = require("express-validator");
const showController = require("../controllers/showController");
const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");

const router = express.Router();

const updateShowValidation = [
  body("startTime")
    .optional()
    .isISO8601()
    .withMessage("Start time must be a valid ISO8601 date string"),
  body("endTime")
    .optional()
    .isISO8601()
    .withMessage("End time must be a valid ISO8601 date string"),
  body("date")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Date cannot be empty"),
  body("time")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Time cannot be empty"),
  body("language")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Language cannot be empty"),
  body("format")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Format cannot be empty"),
  body("standardPrice")
    .optional()
    .isFloat({ min: 1 })
    .withMessage("Standard price must be at least 1"),
  body("premiumPrice")
    .optional()
    .isFloat({ min: 1 })
    .withMessage("Premium price must be at least 1"),
  body("vipPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("VIP price cannot be negative"),
  body("status")
    .optional()
    .isIn(["available", "filling_fast", "almost_full", "sold_out", "cancelled", "completed"])
    .withMessage("Invalid show status")
];

router.get("/", showController.getShows);
router.get("/:id", showController.getShowById);
router.get("/:showId/seats", showController.getSeatLayout);

// Admin operations
router.post("/", authenticate, authorize("admin"), showController.createShow);
router.put("/:id", authenticate, authorize("admin"), updateShowValidation, validate, showController.updateShow);
router.patch("/:id", authenticate, authorize("admin"), updateShowValidation, validate, showController.updateShow);
router.delete("/:id", authenticate, authorize("admin"), showController.deleteShow);

module.exports = router;
module.exports.updateShowValidation = updateShowValidation;
