const crypto = require("crypto");
const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const SeatService = require("./seatService");
const config = require("../config/env");
const {
  BadRequestError,
  ForbiddenError,
  NotFoundError
} = require("../utils/errors");

class PaymentService {
  /**
   * Cryptographically verifies signature for real payment providers (e.g. Razorpay, Stripe).
   */
  static verifyProviderSignature({ provider, orderId, paymentResponse, secret }) {
    if (!secret) {
      throw new BadRequestError(
        "PAYMENT_WEBHOOK_SECRET must be configured for real payment provider verification"
      );
    }

    if (!paymentResponse || !paymentResponse.signature) {
      return false;
    }

    const signature = paymentResponse.signature;

    if (provider === "razorpay") {
      // Razorpay signature verification: HMAC SHA256 of `${orderId}|${paymentId}`
      const paymentId = paymentResponse.paymentId || paymentResponse.razorpay_payment_id || "";
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      try {
        return crypto.timingSafeEqual(
          Buffer.from(signature, "utf8"),
          Buffer.from(expectedSignature, "utf8")
        );
      } catch {
        return false;
      }
    }

    if (provider === "stripe") {
      // Stripe webhook / payment verification integration point:
      const payload = paymentResponse.payload || `${orderId}|${paymentResponse.paymentId || ""}`;
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      try {
        return crypto.timingSafeEqual(
          Buffer.from(signature, "utf8"),
          Buffer.from(expectedSignature, "utf8")
        );
      } catch {
        return false;
      }
    }

    // Generic fallback HMAC verification
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}`)
      .digest("hex");

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, "utf8"),
        Buffer.from(expectedSignature, "utf8")
      );
    } catch {
      return false;
    }
  }

  /**
   * Creates payment order intent on backend.
   */
  static async createPaymentOrder({ bookingId, userId }) {
    const isProduction = (config.nodeEnv || process.env.NODE_ENV) === "production";
    const isDevOrSimulated = config.paymentProvider === "dev" || config.paymentProvider === "simulated";

    if (isProduction && isDevOrSimulated) {
      throw new ForbiddenError(
        `Payment provider '${config.paymentProvider}' is not allowed in production mode. A live provider (e.g. stripe or razorpay) is required.`
      );
    }

    let query = {};
    if (mongoose.Types.ObjectId.isValid(bookingId)) {
      query._id = bookingId;
    } else {
      query.bookingReference = bookingId;
    }

    const booking = await Booking.findOne(query);
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    if (booking.user.toString() !== userId.toString()) {
      throw new ForbiddenError("Unauthorized: you can only pay for your own booking");
    }

    if (booking.bookingStatus !== "pending") {
      throw new BadRequestError(`Cannot pay for a booking with status '${booking.bookingStatus}'`);
    }

    if (new Date(booking.expiresAt) < new Date()) {
      booking.bookingStatus = "expired";
      await booking.save();
      await SeatService.releaseSeats({
        showId: booking.show,
        seatIdentifiers: booking.selectedSeats,
        bookingId: booking._id
      });
      throw new BadRequestError("Booking hold expired. Please select seats and book again.");
    }

    // Check if an existing pending payment order exists for this booking
    let payment = await Payment.findOne({
      booking: booking._id,
      status: "created"
    });

    if (!payment) {
      const providerOrderId = `order_${config.paymentProvider}_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      payment = await Payment.create({
        booking: booking._id,
        user: userId,
        provider: config.paymentProvider,
        providerOrderId,
        amount: booking.totalAmount,
        currency: "USD",
        status: "created"
      });
    }

    return {
      orderId: payment.providerOrderId,
      amount: payment.amount,
      currency: payment.currency,
      bookingId: booking._id.toString(),
      isLive: !isDevOrSimulated
    };
  }

  /**
   * Verifies payment result with idempotency protection and confirms booking & seats.
   */
  static async verifyPayment({ orderId, paymentResponse = {}, userId }) {
    if (!orderId) {
      throw new BadRequestError("Order ID is required for payment verification");
    }

    const payment = await Payment.findOne({ providerOrderId: orderId }).populate("booking");
    if (!payment) {
      throw new NotFoundError("Payment order not found");
    }

    if (payment.user.toString() !== userId.toString()) {
      throw new ForbiddenError("Unauthorized payment verification attempt");
    }

    // Idempotency: If already confirmed, return success immediately
    if (payment.status === "succeeded") {
      return {
        verified: true,
        alreadyProcessed: true,
        isLive: payment.provider !== "dev" && payment.provider !== "simulated",
        booking: payment.booking.toJSON()
      };
    }

    const isProduction = (config.nodeEnv || process.env.NODE_ENV) === "production";
    const isDevOrSimulated = payment.provider === "dev" || payment.provider === "simulated";

    if (isProduction && isDevOrSimulated) {
      throw new ForbiddenError(
        `Payment provider '${payment.provider}' is not allowed in production mode.`
      );
    }

    const booking = await Booking.findById(payment.booking);
    if (!booking) {
      throw new NotFoundError("Associated booking not found");
    }

    // Provider-specific verification
    let isVerified = false;
    if (isDevOrSimulated) {
      isVerified = true;
    } else {
      // Real provider verification using PAYMENT_WEBHOOK_SECRET
      const secret = config.paymentWebhookSecret || process.env.PAYMENT_WEBHOOK_SECRET;
      isVerified = PaymentService.verifyProviderSignature({
        provider: payment.provider,
        orderId,
        paymentResponse,
        secret
      });
    }

    if (!isVerified) {
      payment.status = "failed";
      await payment.save();
      throw new BadRequestError("Payment verification failed. Transaction was not authenticated.");
    }

    // Mark payment as succeeded
    payment.status = "succeeded";
    payment.verifiedAt = new Date();
    payment.providerPaymentId =
      paymentResponse.paymentId ||
      paymentResponse.id ||
      `pay_${payment.provider}_${Date.now()}`;
    payment.metadata = paymentResponse;
    await payment.save();

    // Confirm booking and permanently book seats
    booking.bookingStatus = "confirmed";
    booking.paymentStatus = "paid";
    booking.payment = payment._id;
    await booking.save();

    await SeatService.confirmSeats({
      showId: booking.show,
      seatIdentifiers: booking.selectedSeats,
      bookingId: booking._id
    });

    return {
      verified: true,
      isLive: payment.provider !== "dev" && payment.provider !== "simulated",
      status: "confirmed",
      booking: booking.toJSON()
    };
  }
}

module.exports = PaymentService;
