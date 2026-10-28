const express = require("express");
const { body } = require("express-validator");
const theatreController = require("../controllers/theatreController");
const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");

const router = express.Router();

const updateTheatreValidation = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Theatre name cannot be empty")
    .isLength({ max: 150 })
    .withMessage("Name cannot exceed 150 characters"),
  body("address")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Address cannot be empty"),
  body("city")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("City cannot be empty"),
  body("amenities")
    .optional()
    .isArray()
    .withMessage("Amenities must be an array of strings"),
  body("screensCount")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Screens count must be an integer of at least 1"),
  body("rating")
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage("Rating must be a number between 0 and 5"),
  body("status")
    .optional()
    .isIn(["active", "inactive"])
    .withMessage("Status must be 'active' or 'inactive'")
];

router.get("/", theatreController.getTheatres);
router.get("/:id", theatreController.getTheatreById);
router.get("/:id/screens", theatreController.getTheatreScreens);

// Admin operations
router.post("/", authenticate, authorize("admin"), theatreController.createTheatre);
router.put("/:id", authenticate, authorize("admin"), updateTheatreValidation, validate, theatreController.updateTheatre);
router.patch("/:id", authenticate, authorize("admin"), updateTheatreValidation, validate, theatreController.updateTheatre);
router.delete("/:id", authenticate, authorize("admin"), theatreController.deleteTheatre);

module.exports = router;
module.exports.updateTheatreValidation = updateTheatreValidation;
