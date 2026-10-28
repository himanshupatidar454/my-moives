const request = require("supertest");
const mongoose = require("mongoose");
const { app } = require("../server");
const Movie = require("../models/Movie");
const Theatre = require("../models/Theatre");
const Screen = require("../models/Screen");
const Show = require("../models/Show");
const User = require("../models/User");
const { signToken } = require("../utils/jwt");

const TEST_DB_URI = "mongodb://127.0.0.1:27017/imovies_test_security";

let adminToken;
let userToken;
let testMovie;
let testTheatre;
let testScreen;
let testShow;

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
  await Movie.collection.dropIndexes().catch(() => {});
  await Promise.all([
    Movie.deleteMany({}),
    Theatre.deleteMany({}),
    Screen.deleteMany({}),
    Show.deleteMany({}),
    User.deleteMany({})
  ]);

  const admin = await User.create({
    name: "Admin User",
    email: "admin.sec@test.com",
    passwordHash: "hash123",
    role: "admin",
    status: "active"
  });
  adminToken = signToken({ id: admin._id, role: admin.role });

  const user = await User.create({
    name: "Regular (Test) User [Special]",
    email: "user+filter@test.com",
    passwordHash: "hash123",
    role: "user",
    status: "active"
  });
  userToken = signToken({ id: user._id, role: user.role });

  testMovie = await Movie.create({
    title: "Dune: Part (Two) [IMAX]",
    synopsis: "Paul Atreides unites with Chani and the Fremen.",
    posterUrl: "https://example.com/dune2.jpg",
    genres: ["Sci-Fi (Epic)", "Adventure"],
    language: "English (US)",
    durationMinutes: 166,
    releaseDate: new Date("2024-03-01"),
    releaseStatus: "now-showing",
    averageRating: 8.9,
    reviewCount: 350
  });

  testTheatre = await Theatre.create({
    name: "Cinema City (Downtown)",
    address: "100 Main St (Suite #4)",
    city: "New (York)",
    screensCount: 2,
    rating: 4.8
  });

  testScreen = await Screen.create({
    theatre: testTheatre._id,
    name: "Screen 1",
    screenType: "IMAX"
  });

  testShow = await Show.create({
    movie: testMovie._id,
    theatre: testTheatre._id,
    screen: testScreen._id,
    screenName: testScreen.name,
    startTime: new Date(Date.now() + 86400000),
    endTime: new Date(Date.now() + 86400000 + 7200000),
    time: "07:00 PM",
    date: "2026-11-01",
    language: "English (US)",
    format: "IMAX",
    standardPrice: 18.0,
    premiumPrice: 24.0,
    vipPrice: 30.0,
    status: "available"
  });
});

afterAll(async () => {
  try {
    await Promise.all([
      Movie.deleteMany({}),
      Theatre.deleteMany({}),
      Screen.deleteMany({}),
      Show.deleteMany({}),
      User.deleteMany({})
    ]);
    await mongoose.connection.close();
  } catch (err) {
    console.error("Cleanup error:", err);
  }
});

describe("Regex Input Escaping & Query Safety", () => {
  it("should safely handle special regex characters in movie search without error", async () => {
    // Malicious or invalid regex strings like dangling parens, brackets, asterisks
    const dangerousQueries = ["(", "[", ".*+?^${}()|[]\\", "[Dune]"];

    for (const q of dangerousQueries) {
      const res = await request(app).get(`/api/movies?search=${encodeURIComponent(q)}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.movies)).toBe(true);
    }
  });

  it("should find movie literally when search term contains regex characters", async () => {
    const res = await request(app).get(`/api/movies?search=${encodeURIComponent("Part (Two)")}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.movies.length).toBe(1);
    expect(res.body.data.movies[0].title).toBe("Dune: Part (Two) [IMAX]");
  });

  it("should safely handle special regex characters in movie genre and language filters", async () => {
    const resGenre = await request(app).get(`/api/movies?genre=${encodeURIComponent("Sci-Fi (Epic)")}`);
    expect(resGenre.statusCode).toBe(200);
    expect(resGenre.body.data.movies.length).toBe(1);

    const resLang = await request(app).get(`/api/movies?language=${encodeURIComponent("English (US)")}`);
    expect(resLang.statusCode).toBe(200);
    expect(resLang.body.data.movies.length).toBe(1);

    // Unmatched special regex queries should return empty without 500 error
    const resInvalidRegex = await request(app).get(`/api/movies?genre=${encodeURIComponent("(.*)+")}`);
    expect(resInvalidRegex.statusCode).toBe(200);
    expect(resInvalidRegex.body.data.movies.length).toBe(0);
  });

  it("should safely handle special regex characters in theatre city filter", async () => {
    const res = await request(app).get(`/api/theatres?city=${encodeURIComponent("New (York)")}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.theatres.length).toBe(1);
    expect(res.body.data.theatres[0].name).toBe("Cinema City (Downtown)");

    // Unmatched special regex queries should return empty without 500 error
    const resInvalid = await request(app).get(`/api/theatres?city=${encodeURIComponent("([A-Z]+)")}`);
    expect(resInvalid.statusCode).toBe(200);
    expect(resInvalid.body.data.theatres.length).toBe(0);
  });

  it("should safely handle special regex characters in admin user search", async () => {
    const res = await request(app)
      .get(`/api/admin/users?search=${encodeURIComponent("user+filter")}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.users.length).toBe(1);
    expect(res.body.data.users[0].email).toBe("user+filter@test.com");

    const resSpecial = await request(app)
      .get(`/api/admin/users?search=${encodeURIComponent("(.*)+")}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(resSpecial.statusCode).toBe(200);
  });
});

describe("Update Endpoints: Explicit Allow-List & Ratings Immutability", () => {
  it("PATCH /api/movies/:id should update allowed fields and ignore rating/reviewCount modifications", async () => {
    const res = await request(app)
      .patch(`/api/movies/${testMovie._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Dune: Part Two (Updated Title)",
        synopsis: "Updated synopsis content.",
        // Malicious or unauthorized attempts to alter ratings and vote counts
        rating: 1.0,
        averageRating: 1.0,
        reviewCount: 0,
        voteCount: 0,
        hackField: "should_be_ignored"
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.movie.title).toBe("Dune: Part Two (Updated Title)");
    expect(res.body.data.movie.synopsis).toBe("Updated synopsis content.");

    // Verify in database that rating and review count were untouched
    const freshMovie = await Movie.findById(testMovie._id);
    expect(freshMovie.averageRating).toBe(8.9);
    expect(freshMovie.reviewCount).toBe(350);
    expect(freshMovie.toObject().hackField).toBeUndefined();
  });

  it("PATCH /api/theatres/:id should update allowed fields and ignore unallowed fields", async () => {
    const res = await request(app)
      .patch(`/api/theatres/${testTheatre._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Cinema City Downtown IMAX",
        city: "New York City",
        unauthorizedField: "hacked"
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.theatre.name).toBe("Cinema City Downtown IMAX");
    expect(res.body.data.theatre.city).toBe("New York City");

    const freshTheatre = await Theatre.findById(testTheatre._id);
    expect(freshTheatre.toObject().unauthorizedField).toBeUndefined();
  });

  it("PATCH /api/shows/:id should update allowed fields and ignore unallowed fields", async () => {
    const res = await request(app)
      .patch(`/api/shows/${testShow._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        standardPrice: 20.0,
        time: "08:00 PM",
        injectedField: "bad"
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.show.standardPrice).toBe(20.0);
    expect(res.body.data.show.time).toBe("08:00 PM");

    const freshShow = await Show.findById(testShow._id);
    expect(freshShow.toObject().injectedField).toBeUndefined();
  });
});

describe("Express-Validator Input Validation on Update Endpoints", () => {
  it("PATCH /api/movies/:id should reject invalid duration and status with 422", async () => {
    const resDuration = await request(app)
      .patch(`/api/movies/${testMovie._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ durationMinutes: -10 });

    expect(resDuration.statusCode).toBe(422);
    expect(resDuration.body.success).toBe(false);

    const resStatus = await request(app)
      .patch(`/api/movies/${testMovie._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ releaseStatus: "invalid_status_enum" });

    expect(resStatus.statusCode).toBe(422);
    expect(resStatus.body.success).toBe(false);
  });

  it("PATCH /api/theatres/:id should reject invalid rating and screensCount with 422", async () => {
    const resRating = await request(app)
      .patch(`/api/theatres/${testTheatre._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ rating: 12.5 });

    expect(resRating.statusCode).toBe(422);
    expect(resRating.body.success).toBe(false);

    const resScreens = await request(app)
      .patch(`/api/theatres/${testTheatre._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ screensCount: 0 });

    expect(resScreens.statusCode).toBe(422);
    expect(resScreens.body.success).toBe(false);
  });

  it("PATCH /api/shows/:id should reject negative prices and invalid status with 422", async () => {
    const resPrice = await request(app)
      .patch(`/api/shows/${testShow._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ standardPrice: -5 });

    expect(resPrice.statusCode).toBe(422);
    expect(resPrice.body.success).toBe(false);

    const resStatus = await request(app)
      .patch(`/api/shows/${testShow._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "bogus_status" });

    expect(resStatus.statusCode).toBe(422);
    expect(resStatus.body.success).toBe(false);
  });
});
