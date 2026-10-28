const PaymentService = require("../services/paymentService");
const ApiResponse = require("../utils/apiResponse");

const paymentController = {
  // POST /api/payments/create-order
  createOrder: async (req, res, next) => {
    try {
      const { bookingId } = req.body;
      if (!bookingId) {
        return ApiResponse.error(res, "Booking ID is required", [], 422);
      }

      const orderData = await PaymentService.createPaymentOrder({
        bookingId,
        userId: req.user._id
      });

      return ApiResponse.success(res, "Payment order initiated successfully", orderData);
    } catch (error) {
      const status = error.statusCode || 400;
      return ApiResponse.error(res, error.message, [], status);
    }
  },

  // POST /api/payments/verify
  verifyPayment: async (req, res, next) => {
    try {
      const { orderId, paymentResponse } = req.body;
      if (!orderId) {
        return ApiResponse.error(res, "Order ID is required for verification", [], 422);
      }

      const verificationResult = await PaymentService.verifyPayment({
        orderId,
        paymentResponse,
        userId: req.user._id
      });

      return ApiResponse.success(
        res,
        "Payment verified and booking confirmed successfully",
        verificationResult
      );
    } catch (error) {
      const status = error.statusCode || 400;
      return ApiResponse.error(res, error.message, [], status);
    }
  }
};

module.exports = paymentController;
