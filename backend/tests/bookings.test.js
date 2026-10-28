const request = require("supertest");
const mongoose = require("mongoose");
const { app } = require("../server");
const Movie = require("../models/Movie");
const Theatre = require("../models/Theatre");
const Screen = require("../models/Screen");
const Show = require("../models/Show");
const ShowSeat = require("../models/ShowSeat");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const User = require("../models/User");
const SeatService = require("../services/seatService");
const { signToken } = require("../utils/jwt");

const TEST_DB_URI = "mongodb://127.0.0.1:27017/imovies_test_bookings";

let user1;
let user1Token;
let user2;
let user2Token;
let show;

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
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

  user1 = await User.create({
    name: "Customer One",
    email: "customer1@test.com",
    passwordHash: "hash123",
    role: "user",
    status: "active"
  });
  user1Token = signToken({ id: user1._id, role: user1.role });

  user2 = await User.create({
    name: "Customer Two",
    email: "customer2@test.com",
    passwordHash: "hash123",
    role: "user",
    status: "active"
  });
  user2Token = signToken({ id: user2._id, role: user2.role });

  const movie = await Movie.create({
    title: "Avatar: The Way of Water",
    slug: "avatar-way-of-water",
    synopsis: "Jake Sully lives with his newfound family.",
    posterUrl: "https://example.com/avatar.jpg",
    genres: ["Action", "Sci-Fi"],
    language: "English",
    durationMinutes: 192,
    releaseDate: new Date("2022-12-16"),
    releaseStatus: "now-showing"
  });

  const theatre = await Theatre.create({
    name: "Cineplex Star",
    address: "500 Ocean Ave",
    city: "San Francisco",
    screensCount: 1
  });

  const screen = await Screen.create({
    theatre: theatre._id,
    name: "Screen 1 - 3D Atmos",
    screenType: "3D"
  });

  const startTime = new Date(Date.now() + 48 * 60 * 60 * 1000); // 2 days in future
  const endTime = new Date(startTime.getTime() + 3.5 * 60 * 60 * 1000);

  show = await Show.create({
    movie: movie._id,
    theatre: theatre._id,
    screen: screen._id,
    screenName: screen.name,
    startTime,
    endTime,
    date: startTime.toISOString().split("T")[0],
    time: "08:00 PM",
    standardPrice: 15.0,
    premiumPrice: 22.0
  });

  await SeatService.initializeShowSeats(show._id);
});

afterAll(async () => {
  try {
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

describe("Booking and Payment Workflows", () => {
  let createdBooking;

  it("POST /api/bookings should create a pending booking and reserve seats", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        showId: show._id.toString(),
        seatIdentifiers: ["C4", "C5"]
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.booking.bookingStatus).toBe("pending");
    expect(res.body.data.booking.paymentStatus).toBe("unpaid");
    expect(res.body.data.booking.selectedSeats).toEqual(["C4", "C5"]);
    expect(res.body.data.booking.totalAmount).toBeGreaterThan(0);

    createdBooking = res.body.data.booking;
  });

  it("POST /api/bookings should reject reserving already held seats", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${user2Token}`)
      .send({
        showId: show._id.toString(),
        seatIdentifiers: ["C4"]
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("no longer available");
  });

  it("POST /api/payments/create-order should initiate payment order", async () => {
    const res = await request(app)
      .post("/api/payments/create-order")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        bookingId: createdBooking._id || createdBooking.id
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderId).toBeDefined();
    expect(res.body.data.amount).toBe(createdBooking.totalAmount);
  });

  it("POST /api/payments/verify should confirm booking and permanently book seats", async () => {
    // 1. Get payment order
    const orderRes = await request(app)
      .post("/api/payments/create-order")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        bookingId: createdBooking._id || createdBooking.id
      });

    const orderId = orderRes.body.data.orderId;

    // 2. Verify payment
    const verifyRes = await request(app)
      .post("/api/payments/verify")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        orderId,
        paymentResponse: { paymentId: `pay_test_${Date.now()}` }
      });

    expect(verifyRes.statusCode).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.verified).toBe(true);
    expect(verifyRes.body.data.booking.bookingStatus).toBe("confirmed");
    expect(verifyRes.body.data.booking.paymentStatus).toBe("paid");

    // 3. Check seat status in database -> must be 'booked'
    const bookedSeats = await ShowSeat.find({
      show: show._id,
      seatIdentifier: { $in: ["C4", "C5"] }
    });
    expect(bookedSeats[0].status).toBe("booked");
    expect(bookedSeats[1].status).toBe("booked");
  });

  it("GET /api/bookings/my should return user's confirmed booking", async () => {
    const res = await request(app)
      .get("/api/bookings/my")
      .set("Authorization", `Bearer ${user1Token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.bookings.length).toBeGreaterThan(0);
    expect(res.body.data.bookings[0].bookingReference).toBe(createdBooking.bookingReference);
  });

  it("GET /api/bookings/:id should block User 2 from viewing User 1's booking", async () => {
    const res = await request(app)
      .get(`/api/bookings/${createdBooking._id || createdBooking.id}`)
      .set("Authorization", `Bearer ${user2Token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/bookings/:id/cancel should cancel booking and release seats", async () => {
    const cancelRes = await request(app)
      .post(`/api/bookings/${createdBooking._id || createdBooking.id}/cancel`)
      .set("Authorization", `Bearer ${user1Token}`)
      .send({ reason: "Schedule change" });

    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.body.data.booking.bookingStatus).toBe("cancelled");
    expect(cancelRes.body.data.booking.paymentStatus).toBe("refunded");

    // Check seats released back to 'available'
    const releasedSeats = await ShowSeat.find({
      show: show._id,
      seatIdentifier: { $in: ["C4", "C5"] }
    });
    expect(releasedSeats[0].status).toBe("available");
    expect(releasedSeats[1].status).toBe("available");
  });
});
