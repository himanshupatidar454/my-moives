require("dotenv").config();

function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";

  let mongodbUri = env.MONGODB_URI;
  let jwtSecret = env.JWT_SECRET;

  if (isProduction) {
    const missing = [];
    if (!mongodbUri) missing.push("MONGODB_URI");
    if (!jwtSecret) missing.push("JWT_SECRET");

    if (missing.length > 0) {
      throw new Error(
        `[Config Error] Server cannot start in production mode. Missing required environment variable(s): ${missing.join(", ")}`
      );
    }
  } else {
    if (!mongodbUri) {
      console.warn(
        "[Config Warning] MONGODB_URI is not set. Using dev fallback: mongodb://127.0.0.1:27017/imovies"
      );
      mongodbUri = "mongodb://127.0.0.1:27017/imovies";
    }
    if (!jwtSecret) {
      console.warn(
        "[Config Warning] JWT_SECRET is not set. Using clearly labelled dev fallback: dev_secret_do_not_use_in_production (NOT SAFE FOR PRODUCTION USE)."
      );
      jwtSecret = "dev_secret_do_not_use_in_production";
    }
  }

  return {
    port: parseInt(env.PORT, 10) || 5000,
    mongodbUri,
    jwtSecret,
    jwtExpiresIn: env.JWT_EXPIRES_IN || "7d",
    frontendUrl: env.FRONTEND_URL || "http://localhost:5173",
    nodeEnv,
    paymentProvider: env.PAYMENT_PROVIDER || "dev",
    paymentWebhookSecret: env.PAYMENT_WEBHOOK_SECRET || "",
    reservationHoldMinutes: parseInt(env.RESERVATION_HOLD_MINUTES, 10) || 10
  };
}

const config = loadConfig(process.env);
config.loadConfig = loadConfig;

module.exports = config;
