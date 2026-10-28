const request = require("supertest");
const mongoose = require("mongoose");
const { app } = require("../server");
const config = require("../config/env");

async function runVerification() {
  console.log("=== STARTING FULL-STACK BACKEND VERIFICATION ===");
  await mongoose.connect(config.mongodbUri);
  console.log("[Verification] Connected to MongoDB:", config.mongodbUri);

  // 1. Health check
  const healthRes = await request(app).get("/api/health");
  console.log(`[Test 1] GET /api/health -> ${healthRes.status} (status: ${healthRes.body.data?.status})`);
  if (healthRes.status !== 200) throw new Error("Health check failed");

  // 2. Register real user in MongoDB
  const uniqueEmail = `testuser_${Date.now()}@example.com`;
  const registerRes = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Verification User",
      email: uniqueEmail,
      password: "TestPassword@123",
      phone: "+1-555-9988"
    });
  console.log(`[Test 2] POST /api/auth/register -> ${registerRes.status} (user: ${registerRes.body.data?.user?.email})`);
  if (registerRes.status !== 201 || !registerRes.body.data?.token) {
    throw new Error("Registration failed: " + JSON.stringify(registerRes.body));
  }
  const userToken = registerRes.body.data.token;

  // 3. Duplicate registration rejected
  const dupRes = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Duplicate User",
      email: uniqueEmail,
      password: "TestPassword@123"
    });
  console.log(`[Test 3] POST /api/auth/register duplicate -> ${dupRes.status} (message: ${dupRes.body.message})`);
  if (dupRes.status !== 409) throw new Error("Expected 409 duplicate registration");

  // 4. Login with correct credentials
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({
      email: uniqueEmail,
      password: "TestPassword@123"
    });
  console.log(`[Test 4] POST /api/auth/login -> ${loginRes.status} (token issued: ${!!loginRes.body.data?.token})`);
  if (loginRes.status !== 200) throw new Error("Login failed");

  // 5. Login with invalid password rejected
  const wrongPassRes = await request(app)
    .post("/api/auth/login")
    .send({
      email: uniqueEmail,
      password: "IncorrectPassword!"
    });
  console.log(`[Test 5] POST /api/auth/login (wrong password) -> ${wrongPassRes.status} (message: ${wrongPassRes.body.message})`);
  if (wrongPassRes.status !== 401) throw new Error("Expected 401 for wrong password");

  // 6. Session restoration (/auth/me) with valid token
  const meRes = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${userToken}`);
  console.log(`[Test 6] GET /api/auth/me (valid token) -> ${meRes.status} (email: ${meRes.body.data?.user?.email})`);
  if (meRes.status !== 200) throw new Error("Session restoration failed");

  // 7. Protected route rejected without token
  const noTokenRes = await request(app).get("/api/auth/me");
  console.log(`[Test 7] GET /api/auth/me (no token) -> ${noTokenRes.status} (message: ${noTokenRes.body.message})`);
  if (noTokenRes.status !== 401) throw new Error("Expected 401 without token");

  // 8. Admin-only route rejected for standard user
  const adminForbiddenRes = await request(app)
    .get("/api/admin/stats")
    .set("Authorization", `Bearer ${userToken}`);
  console.log(`[Test 8] GET /api/admin/stats (standard user) -> ${adminForbiddenRes.status} (message: ${adminForbiddenRes.body.message})`);
  if (adminForbiddenRes.status !== 403) throw new Error("Expected 403 Forbidden for non-admin");

  // 9. Admin-only route allowed for admin
  const adminLoginRes = await request(app)
    .post("/api/auth/login")
    .send({
      email: "admin@imovies.com",
      password: "admin123"
    });
  const adminToken = adminLoginRes.body.data?.token;
  const adminStatsRes = await request(app)
    .get("/api/admin/stats")
    .set("Authorization", `Bearer ${adminToken}`);
  console.log(`[Test 9] GET /api/admin/stats (admin token) -> ${adminStatsRes.status} (totalMovies: ${adminStatsRes.body.data?.stats?.totalMovies})`);
  if (adminStatsRes.status !== 200) throw new Error("Admin stats failed");

  // 10. Real password change via PATCH /api/users/me/password
  const changePassRes = await request(app)
    .patch("/api/users/me/password")
    .set("Authorization", `Bearer ${userToken}`)
    .send({
      currentPassword: "TestPassword@123",
      newPassword: "BrandNewPassword@456"
    });
  console.log(`[Test 10] PATCH /api/users/me/password -> ${changePassRes.status}`);
  if (changePassRes.status !== 200) throw new Error("Password change failed");

  // 11. Old password rejected after change
  const oldPassLogin = await request(app)
    .post("/api/auth/login")
    .send({
      email: uniqueEmail,
      password: "TestPassword@123"
    });
  console.log(`[Test 11] POST /api/auth/login (old password) -> ${oldPassLogin.status}`);
  if (oldPassLogin.status !== 401) throw new Error("Old password should be rejected");

  // 12. New password accepted
  const newPassLogin = await request(app)
    .post("/api/auth/login")
    .send({
      email: uniqueEmail,
      password: "BrandNewPassword@456"
    });
  console.log(`[Test 12] POST /api/auth/login (new password) -> ${newPassLogin.status}`);
  if (newPassLogin.status !== 200) throw new Error("New password should be accepted");

  // 13. Movie status filter normalization (now_showing)
  const moviesRes = await request(app).get("/api/movies?status=now_showing");
  console.log(`[Test 13] GET /api/movies?status=now_showing -> ${moviesRes.status} (count: ${moviesRes.body.data?.movies?.length})`);
  if (moviesRes.status !== 200 || !moviesRes.body.data?.movies?.length) {
    throw new Error("Movies status normalization failed");
  }
  const firstMovieId = moviesRes.body.data.movies[0].id;

  // 14. Favorites persistence in MongoDB
  const addFavRes = await request(app)
    .post(`/api/favorites/${firstMovieId}`)
    .set("Authorization", `Bearer ${userToken}`);
  console.log(`[Test 14a] POST /api/favorites/${firstMovieId} -> ${addFavRes.status}`);

  const getFavRes = await request(app)
    .get("/api/favorites")
    .set("Authorization", `Bearer ${userToken}`);
  console.log(`[Test 14b] GET /api/favorites -> ${getFavRes.status} (favorites count: ${getFavRes.body.data?.favorites?.length})`);
  if (getFavRes.status !== 200 || getFavRes.body.data?.favorites?.length !== 1) {
    throw new Error("Favorites persistence failed");
  }

  // 15. Review submission with content alias and recalculation
  const reviewRes = await request(app)
    .post(`/api/movies/${firstMovieId}/reviews`)
    .set("Authorization", `Bearer ${userToken}`)
    .send({
      rating: 9,
      content: "Superb cinematic masterpiece! Stunning visuals and sound."
    });
  console.log(`[Test 15] POST /api/movies/${firstMovieId}/reviews -> ${reviewRes.status}`);
  if (reviewRes.status !== 201) throw new Error("Review submission failed");

  console.log("=== ALL FULL-STACK BACKEND VERIFICATION CHECKS PASSED SUCCESSFULLY ===");
  await mongoose.connection.close();
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
