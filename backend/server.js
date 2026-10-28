const http = require("http");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const config = require("./config/env");
const connectDB = require("./config/db");
const ApiResponse = require("./utils/apiResponse");
const { notFoundHandler, errorHandler } = require("./middlewares/errorHandler");
const { apiLimiter } = require("./middlewares/rateLimiter");
const { initSocket } = require("./utils/socket");
const BookingService = require("./services/bookingService");

const app = express();
let server = null;

// Security Headers
app.use(helmet());

// CORS Configuration

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));

// Body Parsing with size limits
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Lightweight Development Request Logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (config.nodeEnv !== "test") {
      const duration = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.originalUrl || req.url} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// General Rate Limiter
app.use("/api", apiLimiter);

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  return ApiResponse.success(res, "IMovies backend is running", {
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Routes
const authRoutes = require("./routes/authRoutes");
const movieRoutes = require("./routes/movieRoutes");
const theatreRoutes = require("./routes/theatreRoutes");
const showRoutes = require("./routes/showRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const userRoutes = require("./routes/userRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const adminRoutes = require("./routes/adminRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/theatres", theatreRoutes);
app.use("/api/shows", showRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);

// 404 and Centralized Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    await connectDB();
    BookingService.startPeriodicCleanup();
    server = http.createServer(app);
    initSocket(server, corsOptions);
    const port = config.port;
    server.listen(port, () => {
      console.log(`[Server] IMovies backend listening on port ${port} (env: ${config.nodeEnv})`);
    });
    return server;
  } catch (error) {
    console.error("[Server] Startup failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, server, startServer };
