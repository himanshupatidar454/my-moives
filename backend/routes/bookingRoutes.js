const express = require("express");
const bookingController = require("../controllers/bookingController");
const { authenticate } = require("../middlewares/auth");

const router = express.Router();

router.post("/", authenticate, bookingController.createBooking);
router.post("/verify-coupon", authenticate, bookingController.verifyCoupon);
router.post("/coupon", authenticate, bookingController.verifyCoupon);
router.get("/my", authenticate, bookingController.getMyBookings);
router.get("/my-bookings", authenticate, bookingController.getMyBookings);
router.get("/:id", authenticate, bookingController.getBookingById);
router.post("/:id/cancel", authenticate, bookingController.cancelBooking);

module.exports = router;
