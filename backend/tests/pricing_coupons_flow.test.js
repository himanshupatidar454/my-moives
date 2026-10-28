const request = require("supertest");
const mongoose = require("mongoose");
const { app } = require("../server");
const User = require("../models/User");
const Movie = require("../models/Movie");
const Theatre = require("../models/Theatre");
const Screen = require("../models/Screen");
const Show = require("../models/Show");
const Booking = require("../models/Booking");
const ShowSeat = require("../models/ShowSeat");

describe("Pricing, Coupons, and Booking Flow Tests", () => {
  let userToken;
  let userId;
  let testMovie;
  let testTheatre;
  let testScreen;
  let testShow;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/imovies");
    }

    await User.deleteMany({ email: "pricingtest@imovies.com" });
    await Movie.deleteMany({ title: "Pricing Test Movie" });
    await Theatre.deleteMany({ name: "Pricing Test Theatre" });

    const userRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Pricing Tester",
        email: "pricingtest@imovies.com",
        password: "password123",
        phone: "+15559998877"
      });

    userToken = userRes.body.token || userRes.body.data.token;
    userId = userRes.body.user?.id || userRes.body.data.user?.id;

    testMovie = await Movie.create({
      title: "Pricing Test Movie",
      slug: "pricing-test-movie",
      posterUrl: "https://example.com/poster.jpg",
      synopsis: "Testing show pricing and seat layouts",
      durationMinutes: 125,
      genres: ["Action", "Sci-Fi"],
      language: "English",
      releaseDate: new Date()
    });

    testTheatre = await Theatre.create({
      name: "Pricing Test Theatre",
      city: "New York",
      address: "100 Broadway",
      screensCount: 1
    });

    testScreen = await Screen.create({
      theatre: testTheatre._id,
      name: "Auditorium 1",
      screenType: "Standard",
      capacity: 36,
      seatLayout: [
        {
          row: "A",
          type: "standard",
          seats: [
            { number: 1, seatCode: "A1" },
            { number: 2, seatCode: "A2" }
          ]
        },
        {
          row: "B",
          type: "premium",
          seats: [
            { number: 1, seatCode: "B1" },
            { number: 2, seatCode: "B2" }
          ]
        },
        {
          row: "C",
          type: "vip",
          seats: [
            { number: 1, seatCode: "C1" },
            { number: 2, seatCode: "C2" }
          ]
        }
      ]
    });

    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    testShow = await Show.create({
      movie: testMovie._id,
      theatre: testTheatre._id,
      screen: testScreen._id,
      screenName: "Auditorium 1",
      startTime: start,
      endTime: end,
      date: start.toISOString().split("T")[0],
      time: "07:00 PM",
      standardPrice: 15.00,
      premiumPrice: 20.00,
      vipPrice: 30.00,
      ticketFee: 2.00,
      maxSeatsPerBooking: 6
    });
  });

  afterAll(async () => {
    if (testShow) {
      await ShowSeat.deleteMany({ show: testShow._id });
      await Booking.deleteMany({ show: testShow._id });
      await Show.findByIdAndDelete(testShow._id);
    }
    if (testScreen) await Screen.findByIdAndDelete(testScreen._id);
    if (testTheatre) await Theatre.findByIdAndDelete(testTheatre._id);
    if (testMovie) await Movie.findByIdAndDelete(testMovie._id);
    if (userId) await User.findByIdAndDelete(userId);
    await mongoose.connection.close();
  });

  it("GET /api/shows/:id should return fee per ticket, max seats, and seat type pricing", async () => {
    const res = await request(app).get(`/api/shows/${testShow._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const show = res.body.data.show || res.body.show;
    expect(show.ticketFee).toBe(2.00);
    expect(show.maxSeatsPerBooking).toBe(6);
    expect(show.standardPrice).toBe(15.00);
    expect(show.premiumPrice).toBe(20.00);
    expect(show.vipPrice).toBe(30.00);
    expect(show.pricing).toBeDefined();
    expect(show.pricing.ticketFee).toBe(2.00);
    expect(show.pricing.maxSeatsPerBooking).toBe(6);
  });

  it("GET /api/shows/:showId/seats should return layout with pricing and VIP seats priced correctly", async () => {
    const res = await request(app).get(`/api/shows/${testShow._id}/seats`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.ticketFee || res.body.data.ticketFee).toBe(2.00);
    expect(res.body.maxSeatsPerBooking || res.body.data.maxSeatsPerBooking).toBe(6);
    const pricing = res.body.pricing || res.body.data.pricing;
    expect(pricing.vipPrice).toBe(30.00);
    expect(pricing.standardPrice).toBe(15.00);
    expect(pricing.premiumPrice).toBe(20.00);

    const layout = res.body.seatLayout || res.body.data.seatLayout;
    expect(layout.length).toBe(3);

    const vipRow = layout.find((r) => r.row === "C");
    expect(vipRow).toBeDefined();
    expect(vipRow.type).toBe("vip");
    expect(vipRow.seats[0].price).toBe(30.00);

    const standardRow = layout.find((r) => r.row === "A");
    expect(standardRow.seats[0].price).toBe(15.00);

    const premiumRow = layout.find((r) => r.row === "B");
    expect(premiumRow.seats[0].price).toBe(20.00);
  });

  it("POST /api/bookings/verify-coupon should validate coupons and calculate discount", async () => {
    // Test IMOVIES5 ($5 discount)
    const res1 = await request(app)
      .post("/api/bookings/verify-coupon")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ couponCode: "IMOVIES5", subtotal: 50.00 });

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    const data1 = res1.body.data || res1.body;
    expect(data1.valid).toBe(true);
    expect(data1.discount).toBe(5.00);

    // Test PREMIERE10 (10% discount)
    const res2 = await request(app)
      .post("/api/bookings/verify-coupon")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ couponCode: "PREMIERE10", subtotal: 60.00 });

    expect(res2.status).toBe(200);
    const data2 = res2.body.data || res2.body;
    expect(data2.valid).toBe(true);
    expect(data2.discount).toBe(6.00);

    // Test invalid coupon
    const res3 = await request(app)
      .post("/api/bookings/verify-coupon")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ couponCode: "BOGUS_COUPON", subtotal: 60.00 });

    expect(res3.status).toBe(400);
    expect(res3.body.success).toBe(false);
  });

  it("POST /api/bookings should calculate discount on server and save on booking", async () => {
    // Book VIP seat C1 (price $30) + fee ($2.00) with coupon IMOVIES5 ($5 off)
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        showId: testShow._id.toString(),
        seatIdentifiers: ["C1"],
        couponCode: "IMOVIES5"
      });

    expect(res.status).toBe(201);
    const booking = res.body.data?.booking || res.body.booking;
    expect(booking).toBeDefined();
    expect(booking.ticketSubtotal).toBe(30.00);
    expect(booking.fees).toBe(2.00);
    expect(booking.discount).toBe(5.00);
    expect(booking.totalAmount).toBe(27.00); // 30 + 2 - 5 = 27
    expect(booking.couponCode).toBe("IMOVIES5");
  });

  it("POST /api/bookings should enforce maximum seats per booking", async () => {
    // Try to book 7 seats when max is 6
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        showId: testShow._id.toString(),
        seatIdentifiers: ["A1", "A2", "B1", "B2", "C1", "C2", "D1"]
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/maximum of 6 seats/);
  });
});
