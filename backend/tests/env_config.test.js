const config = require("../config/env");

describe("Environment Configuration & Security (backend/config/env.js)", () => {
  it("should throw in production if JWT_SECRET is missing", () => {
    const env = {
      NODE_ENV: "production",
      MONGODB_URI: "mongodb://127.0.0.1:27017/imovies"
      // JWT_SECRET is omitted
    };

    expect(() => config.loadConfig(env)).toThrow(/Missing required environment variable.*JWT_SECRET/i);
  });

  it("should throw in production if MONGODB_URI is missing", () => {
    const env = {
      NODE_ENV: "production",
      JWT_SECRET: "valid_production_secret_key"
      // MONGODB_URI is omitted
    };

    expect(() => config.loadConfig(env)).toThrow(/Missing required environment variable.*MONGODB_URI/i);
  });

  it("should throw in production if both JWT_SECRET and MONGODB_URI are missing", () => {
    const env = {
      NODE_ENV: "production"
    };

    expect(() => config.loadConfig(env)).toThrow(/Missing required environment variable/i);
  });

  it("should succeed in production when all required variables are supplied", () => {
    const env = {
      NODE_ENV: "production",
      MONGODB_URI: "mongodb://prod-cluster:27017/imovies_prod",
      JWT_SECRET: "strong_production_secret_key_123"
    };

    const loaded = config.loadConfig(env);
    expect(loaded.nodeEnv).toBe("production");
    expect(loaded.mongodbUri).toBe("mongodb://prod-cluster:27017/imovies_prod");
    expect(loaded.jwtSecret).toBe("strong_production_secret_key_123");
  });

  it("should use a clearly labelled dev fallback with warning in development/test", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const env = {
      NODE_ENV: "development"
      // JWT_SECRET and MONGODB_URI omitted
    };

    const loaded = config.loadConfig(env);
    expect(warnSpy).toHaveBeenCalled();
    expect(loaded.jwtSecret).toContain("dev");
    expect(loaded.mongodbUri).toContain("mongodb://");

    warnSpy.mockRestore();
  });
});
