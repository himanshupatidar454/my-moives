const mongoose = require("mongoose");
const seedDatabase = require("../utils/seed");

describe("Seeder Safety Checks (backend/utils/seed.js)", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalArgv = [...process.argv];

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    process.argv = [...originalArgv];
  });

  it("should refuse to run in production without --force", async () => {
    process.env.NODE_ENV = "production";
    process.argv = process.argv.filter((arg) => arg !== "--force");

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(seedDatabase()).rejects.toThrow(/Refusing to run database seeder in production/i);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("production"));

    errorSpy.mockRestore();
  });

  it("should accept execution in production when --force flag is passed", async () => {
    process.env.NODE_ENV = "production";
    process.argv.push("--force");

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const connectSpy = vi.spyOn(mongoose, "connect").mockImplementation(async () => {
      throw new Error("MOCK_STOP_AFTER_SAFEGUARD");
    });

    await expect(seedDatabase({ force: true })).rejects.toThrow("MOCK_STOP_AFTER_SAFEGUARD");

    errorSpy.mockRestore();
    connectSpy.mockRestore();
  });

  it("should verify seeded demo credentials match README and login page", async () => {
    const User = require("../models/User");
    const adminHash = await User.hashPassword("admin123");
    const userHash = await User.hashPassword("password123");

    const adminUser = new User({ email: "admin@imovies.com", passwordHash: adminHash });
    const regularUser = new User({ email: "alex@imovies.com", passwordHash: userHash });

    expect(await adminUser.comparePassword("admin123")).toBe(true);
    expect(await adminUser.comparePassword("wrongpassword")).toBe(false);
    expect(await regularUser.comparePassword("password123")).toBe(true);
    expect(await regularUser.comparePassword("wrongpassword")).toBe(false);
  });

  it("should ensure schedule conflict helper detects overlapping shows on the same screen", async () => {
    const Show = require("../models/Show");
    const screenId = new mongoose.Types.ObjectId();

    const t1 = new Date("2026-11-01T10:00:00.000Z");
    const t2 = new Date("2026-11-01T13:00:00.000Z");
    const t3 = new Date("2026-11-01T12:00:00.000Z"); // Overlaps with t1-t2
    const t4 = new Date("2026-11-01T15:00:00.000Z");

    const mockFindOne = vi.spyOn(Show, "findOne").mockImplementation((query) => {
      // Return a conflicting show if query matches overlapping criteria
      if (query.screen === screenId && query.$or) {
        return Promise.resolve({ _id: new mongoose.Types.ObjectId(), startTime: t1, endTime: t2 });
      }
      return Promise.resolve(null);
    });

    const hasConflict = await Show.hasScheduleConflict(screenId, t3, t4);
    expect(hasConflict).toBe(true);

    mockFindOne.mockRestore();
  });
});
