const request = require("supertest");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { app } = require("../server");
const Movie = require("../models/Movie");
const Theatre = require("../models/Theatre");
const Screen = require("../models/Screen");
const Show = require("../models/Show");
const ShowSeat = require("../models/ShowSeat");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const User = require("../models/User");
const config = require("../config/env");
const BookingService = require("../services/bookingService");
const PaymentService = require("../services/paymentService");
const SeatService = require("../services/seatService");
const { signToken } = require("../utils/jwt");
const {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ConflictError
} = require("../utils/errors");

const TEST_DB_URI = "mongodb://127.0.0.1:27017/imovies_test_fixes";

let adminToken;
let user1Token;
let user1;
let user2Token;
let user2;

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
  await Movie.collection.dropIndexes().catch(() => {});
  await Promise.all([
    Movie.deleteMany({}),
    Theatre.deleteMany({}),
    Screen.deleteMany({}),
    Show.deleteMany({}),
    ShowSeat.deleteMany({}),
    Booking.deleteMany({}),
    Payment.deleteMany({}),
    User.deleteMany({})
  ]);

  const admin = await User.create({
    name: "Admin Fixes",
    email: "admin.fixes@test.com",
    passwordHash: "hash123",
    role: "admin",
    status: "active"
  });
  adminToken = signToken({ id: admin._id, role: admin.role });

  user1 = await User.create({
    name: "User One",
    email: "user1.fixes@test.com",
    passwordHash: "hash123",
    role: "user",
    status: "active"
  });
  user1Token = signToken({ id: user1._id, role: user1.role });

  user2 = await User.create({
    name: "User Two",
    email: "user2.fixes@test.com",
    passwordHash: "hash123",
    role: "user",
    status: "active"
  });
  user2Token = signToken({ id: user2._id, role: user2.role });
});

afterAll(async () => {
  try {
    BookingService.stopPeriodicCleanup();
    await Promise.all([
      Movie.deleteMany({}),
      Theatre.deleteMany({}),
      Screen.deleteMany({}),
      Show.deleteMany({}),
      ShowSeat.deleteMany({}),
      Booking.deleteMany({}),
      Payment.deleteMany({}),
      User.deleteMany({})
    ]);
    await mongoose.connection.close();
  } catch (err) {
    console.error("Cleanup error:", err);
  }
});

describe("(1) Payment Verification & Provider Security", () => {
  it("should disallow dev/simulated providers when in production", async () => {
    const originalEnv = config.nodeEnv;
    const originalProvider = config.paymentProvider;

    try {
      config.nodeEnv = "production";
      config.paymentProvider = "dev";

      await expect(
        PaymentService.createPaymentOrder({ bookingId: new mongoose.Types.ObjectId(), userId: user1._id })
      ).rejects.toThrow(ForbiddenError);

      const fakePayment = await Payment.create({
        booking: new mongoose.Types.ObjectId(),
        user: user1._id,
        provider: "dev",
        providerOrderId: "order_dev_prod_test",
        amount: 25,
        currency: "USD",
        status: "created"
      });

      await expect(
        PaymentService.verifyPayment({ orderId: fakePayment.providerOrderId, userId: user1._id })
      ).rejects.toThrow(ForbiddenError);
    } finally {
      config.nodeEnv = originalEnv;
      config.paymentProvider = originalProvider;
    }
  });

  it("should reject real provider verification if signature does not match PAYMENT_WEBHOOK_SECRET", async () => {
    const webhookSecret = "test_webhook_secret_key_999";
    const orderId = "order_rzp_12345";
    const paymentId = "pay_rzp_67890";

    const isBogusValid = PaymentService.verifyProviderSignature({
      provider: "razorpay",
      orderId,
      paymentResponse: { paymentId, signature: "completely_fake_signature" },
      secret: webhookSecret
    });
    expect(isBogusValid).toBe(false);

    const isMissingValid = PaymentService.verifyProviderSignature({
      provider: "razorpay",
      orderId,
      paymentResponse: { paymentId },
      secret: webhookSecret
    });
    expect(isMissingValid).toBe(false);
  });

  it("should verify valid signature generated with PAYMENT_WEBHOOK_SECRET for real providers", async () => {
    const webhookSecret = "test_webhook_secret_key_999";
    const orderId = "order_rzp_12345";
    const paymentId = "pay_rzp_67890";

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const isValid = PaymentService.verifyProviderSignature({
      provider: "razorpay",
      orderId,
      paymentResponse: { paymentId, signature: expectedSignature },
      secret: webhookSecret
    });
    expect(isValid).toBe(true);
  });
});

describe("(2) Collision-Safe Booking References & Seat Release on Failure", () => {
  it("should generate a collision-safe, longer booking reference", () => {
    const ref1 = Booking.generateReference();
    const ref2 = Booking.generateReference();

    expect(ref1).toMatch(/^IMV-[A-Z0-9]+-[A-F0-9]{8}$/);
    expect(ref1).not.toBe(ref2);
    expect(ref1.length).toBeGreaterThan(12);
  });

  it("should release reserved seats if booking creation fails after reservation", async () => {
    const movie = await Movie.create({
      title: "Test Seat Release Movie",
      synopsis: "Testing seat release upon failure",
      posterUrl: "https://example.com/poster.jpg",
      genres: ["Action"],
      durationMinutes: 120,
      releaseDate: new Date()
    });

    const theatre = await Theatre.create({
      name: "Release Test Theatre",
      address: "123 Test Rd",
      city: "Test City"
    });

    const screen = await Screen.create({
      theatre: theatre._id,
      name: "Screen A"
    });

    const show = await Show.create({
      movie: movie._id,
      theatre: theatre._id,
      screen: screen._id,
      startTime: new Date(Date.now() + 36000000),
      endTime: new Date(Date.now() + 43200000),
      standardPrice: 15,
      premiumPrice: 20
    });

    await SeatService.initializeShowSeats(show._id);

    // Mock Booking.create to deliberately fail and verify rollback of reserved seats
    const createSpy = vi.spyOn(Booking, "create").mockImplementationOnce(async () => {
      throw new Error("DATABASE_SIMULATED_FAILURE");
    });

    await expect(
      BookingService.createBooking({
        userId: user1._id,
        showId: show._id,
        seatIdentifiers: ["A1", "A2"]
      })
    ).rejects.toThrow("DATABASE_SIMULATED_FAILURE");

    createSpy.mockRestore();

    // Verify seats were released back to 'available'
    const seats = await ShowSeat.find({ show: show._id, seatIdentifier: { $in: ["A1", "A2"] } });
    expect(seats[0].status).toBe("available");
    expect(seats[0].reservedBy).toBeNull();
    expect(seats[1].status).toBe("available");
    expect(seats[1].reservedBy).toBeNull();
  });
});

describe("(3) Booking Cancellation Refund Handling", () => {
  let showForCancel;

  beforeAll(async () => {
    const movie = await Movie.create({
      title: "Cancel Movie",
      synopsis: "Testing cancellations",
      posterUrl: "https://example.com/cancel.jpg",
      genres: ["Drama"],
      durationMinutes: 110,
      releaseDate: new Date()
    });

    const theatre = await Theatre.create({
      name: "Cancel Theatre",
      address: "456 Test Way",
      city: "Test City"
    });

    const screen = await Screen.create({
      theatre: theatre._id,
      name: "Screen C"
    });

    showForCancel = await Show.create({
      movie: movie._id,
      theatre: theatre._id,
      screen: screen._id,
      startTime: new Date(Date.now() + 86400000),
      endTime: new Date(Date.now() + 93600000),
      standardPrice: 10,
      premiumPrice: 15
    });

    await SeatService.initializeShowSeats(showForCancel._id);
  });

  it("cancelling an unpaid booking should not mark refundAmount and leave payment unpaid", async () => {
    const booking = await BookingService.createBooking({
      userId: user1._id,
      showId: showForCancel._id,
      seatIdentifiers: ["B1"]
    });

    expect(booking.paymentStatus).toBe("unpaid");

    const cancelled = await BookingService.cancelBooking({
      bookingId: booking._id,
      userId: user1._id
    });

    expect(cancelled.bookingStatus).toBe("cancelled");
    expect(cancelled.paymentStatus).toBe("unpaid");
    expect(cancelled.cancellationDetails.refundAmount).toBe(0);
  });

  it("cancelling a paid booking should mark paymentStatus refunded and record full refundAmount", async () => {
    const booking = await BookingService.createBooking({
      userId: user1._id,
      showId: showForCancel._id,
      seatIdentifiers: ["B2"]
    });

    // Simulate payment completion
    booking.paymentStatus = "paid";
    booking.bookingStatus = "confirmed";
    await booking.save();

    const cancelled = await BookingService.cancelBooking({
      bookingId: booking._id,
      userId: user1._id
    });

    expect(cancelled.bookingStatus).toBe("cancelled");
    expect(cancelled.paymentStatus).toBe("refunded");
    expect(cancelled.cancellationDetails.refundAmount).toBe(booking.totalAmount);
    expect(cancelled.cancellationDetails.refundAmount).toBeGreaterThan(0);
  });
});

describe("(4) Custom Error Classes with HTTP Status Codes", () => {
  it("should verify custom error instances carry correct status codes", () => {
    const badReq = new BadRequestError("Bad request");
    expect(badReq.statusCode).toBe(400);

    const forbidden = new ForbiddenError("Forbidden");
    expect(forbidden.statusCode).toBe(403);

    const notFound = new NotFoundError("Not found");
    expect(notFound.statusCode).toBe(404);

    const conflict = new ConflictError("Conflict");
    expect(conflict.statusCode).toBe(409);
  });

  it("controllers should return 403 when user is blocked from viewing another user booking", async () => {
    const booking = await Booking.create({
      user: user1._id,
      show: new mongoose.Types.ObjectId(),
      movie: new mongoose.Types.ObjectId(),
      theatre: new mongoose.Types.ObjectId(),
      screen: new mongoose.Types.ObjectId(),
      ticketSubtotal: 15,
      totalAmount: 16.5,
      expiresAt: new Date(Date.now() + 600000)
    });

    const res = await request(app)
      .get(`/api/bookings/${booking._id}`)
      .set("Authorization", `Bearer ${user2Token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe("(5) Orphaned Data Protection on Delete", () => {
  it("should block deleting a movie if upcoming shows exist", async () => {
    const movie = await Movie.create({
      title: "Orphan Test Movie",
      synopsis: "Cannot be deleted",
      posterUrl: "https://example.com/orphan.jpg",
      genres: ["Sci-Fi"],
      durationMinutes: 130,
      releaseDate: new Date()
    });

    const theatre = await Theatre.create({
      name: "Orphan Theatre",
      address: "789 St",
      city: "City"
    });

    const screen = await Screen.create({
      theatre: theatre._id,
      name: "Screen 1"
    });

    await Show.create({
      movie: movie._id,
      theatre: theatre._id,
      screen: screen._id,
      startTime: new Date(Date.now() + 72000000),
      endTime: new Date(Date.now() + 79200000),
      standardPrice: 12,
      premiumPrice: 18
    });

    const res = await request(app)
      .delete(`/api/movies/${movie._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain("upcoming show");

    // Movie must still exist
    const checkMovie = await Movie.findById(movie._id);
    expect(checkMovie).not.toBeNull();
  });

  it("should block deleting a theatre if upcoming shows exist", async () => {
    const movie = await Movie.create({
      title: "Theatre Protect Movie",
      synopsis: "Testing theatre protection",
      posterUrl: "https://example.com/p.jpg",
      genres: ["Action"],
      durationMinutes: 125,
      releaseDate: new Date()
    });

    const theatre = await Theatre.create({
      name: "Protected Theatre",
      address: "100 Safe St",
      city: "Safe City"
    });

    const screen = await Screen.create({
      theatre: theatre._id,
      name: "Screen Safe"
    });

    await Show.create({
      movie: movie._id,
      theatre: theatre._id,
      screen: screen._id,
      startTime: new Date(Date.now() + 72000000),
      endTime: new Date(Date.now() + 79200000),
      standardPrice: 12,
      premiumPrice: 18
    });

    const res = await request(app)
      .delete(`/api/theatres/${theatre._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain("upcoming show");

    const checkTheatre = await Theatre.findById(theatre._id);
    expect(checkTheatre).not.toBeNull();
  });

  it("should block deleting a show with paid bookings and never delete its seats", async () => {
    const movie = await Movie.create({
      title: "Show Protect Movie",
      synopsis: "Testing show protection",
      posterUrl: "https://example.com/sp.jpg",
      genres: ["Action"],
      durationMinutes: 140,
      releaseDate: new Date()
    });

    const theatre = await Theatre.create({
      name: "Show Protect Theatre",
      address: "200 Safe St",
      city: "Safe City"
    });

    const screen = await Screen.create({
      theatre: theatre._id,
      name: "Screen Show Protect"
    });

    const show = await Show.create({
      movie: movie._id,
      theatre: theatre._id,
      screen: screen._id,
      startTime: new Date(Date.now() + 72000000),
      endTime: new Date(Date.now() + 79200000),
      standardPrice: 12,
      premiumPrice: 18
    });

    await SeatService.initializeShowSeats(show._id);

    // Create a paid booking for this show
    await Booking.create({
      user: user1._id,
      show: show._id,
      movie: movie._id,
      theatre: theatre._id,
      screen: screen._id,
      ticketSubtotal: 12,
      totalAmount: 13.5,
      bookingStatus: "confirmed",
      paymentStatus: "paid",
      expiresAt: new Date(Date.now() + 86400000)
    });

    const res = await request(app)
      .delete(`/api/shows/${show._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain("confirmed/paid booking");

    // Ensure seats for this show were NOT deleted
    const remainingSeats = await ShowSeat.find({ show: show._id });
    expect(remainingSeats.length).toBeGreaterThan(0);
  });
});

describe("(6) Booking Expiration Cleanup & Index", () => {
  it("should have index on bookingStatus and expiresAt", async () => {
    const indexes = await Booking.collection.indexes();
    const hasExpiryIndex = indexes.some(
      (idx) => idx.key.bookingStatus !== undefined && idx.key.expiresAt !== undefined
    );
    expect(hasExpiryIndex).toBe(true);
  });

  it("should periodically clean up expired pending bookings", async () => {
    const expiredBooking = await Booking.create({
      user: user1._id,
      show: new mongoose.Types.ObjectId(),
      movie: new mongoose.Types.ObjectId(),
      theatre: new mongoose.Types.ObjectId(),
      screen: new mongoose.Types.ObjectId(),
      ticketSubtotal: 20,
      totalAmount: 21.5,
      bookingStatus: "pending",
      paymentStatus: "unpaid",
      expiresAt: new Date(Date.now() - 60000) // 1 minute ago
    });

    const expiredCount = await BookingService.cleanupExpiredBookings();
    expect(expiredCount).toBeGreaterThanOrEqual(1);

    const refreshed = await Booking.findById(expiredBooking._id);
    expect(refreshed.bookingStatus).toBe("expired");
  });
});

describe("(7) New Movies Rating & Review Count", () => {
  it("newly created movie must start with rating 0 and review count 0", async () => {
    const res = await request(app)
      .post("/api/movies")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Brand New Zero Rating Film",
        synopsis: "Freshly introduced catalogue item",
        posterUrl: "https://example.com/fresh.jpg",
        genres: ["Comedy"],
        language: "English",
        durationMinutes: 105,
        rating: 9.5 // Sent by client, must be ignored in favor of 0
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.movie.rating).toBe(0);
    expect(res.body.data.movie.reviewCount).toBe(0);

    const storedMovie = await Movie.findById(res.body.data.movie.id || res.body.data.movie._id);
    expect(storedMovie.averageRating).toBe(0);
    expect(storedMovie.reviewCount).toBe(0);
  });
});
