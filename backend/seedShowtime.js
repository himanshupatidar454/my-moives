const mongoose = require("mongoose");
require("dotenv").config();

const Movie = require("./models/Movie");
const Theatre = require("./models/Theatre");
const Screen = require("./models/Screen");
const Show = require("./models/Show");
const SeatService = require("./services/seatService");

const sampleTimeSlots = [
  { time: "10:30 AM", h: 10, m: 30 },
  { time: "01:45 PM", h: 13, m: 45 },
  { time: "05:15 PM", h: 17, m: 15 },
  { time: "08:30 PM", h: 20, m: 30 }
];

async function seedShowtimes() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error("Missing MONGODB_URI in backend/.env");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Remove old shows and seat inventories to keep data consistent
    await Show.deleteMany({});
    const ShowSeat = require("./models/ShowSeat");
    await ShowSeat.deleteMany({});
    console.log("Cleared old showtimes and seat records.");

    const movies = await Movie.find({ releaseStatus: "now-showing" });
    const theatres = await Theatre.find({ status: "active" });

    if (movies.length === 0) {
      throw new Error("No now-showing movies found. Please run seedMovies.js first.");
    }
    if (theatres.length === 0) {
      throw new Error("No active theatres found. Please run seedTheatres.js first.");
    }

    let totalShows = 0;

    // Seed 7 days of shows (today through the next 6 days)
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() + dayOffset);
      const year = dateObj.getFullYear();
const month = String(dateObj.getMonth() + 1).padStart(2, "0");
const day = String(dateObj.getDate()).padStart(2, "0");
const isoDate = `${year}-${month}-${day}`;
      for (const theatre of theatres) {
        const screens = await Screen.find({ theatre: theatre._id, status: "active" });
        if (screens.length === 0) continue;

        for (let mIdx = 0; mIdx < movies.length; mIdx++) {
          const movie = movies[mIdx];
          const screen = screens[mIdx % screens.length];

          // Rotate time slots per movie and day
          const slots = (mIdx + dayOffset) % 2 === 0
            ? [sampleTimeSlots[0], sampleTimeSlots[2]]
            : [sampleTimeSlots[1], sampleTimeSlots[3]];

          for (const slot of slots) {
            const start = new Date(dateObj);
            start.setHours(slot.h, slot.m, 0, 0);
            const duration = movie.durationMinutes || 120;
            const end = new Date(start.getTime() + (duration + 30) * 60 * 1000);

            const hasConflict = await Show.hasScheduleConflict(screen._id, start, end);
            if (hasConflict) continue;

            const showDoc = await Show.create({
              movie: movie._id,
              theatre: theatre._id,
              screen: screen._id,
              screenName: screen.name,
              startTime: start,
              endTime: end,
              time: slot.time,
              date: isoDate,
              language: movie.language || "English",
              format: screen.screenType || "Standard",
              standardPrice: 15.5,
              premiumPrice: 22.0,
              vipPrice: 28.0,
              ticketFee: 1.5,
              maxSeatsPerBooking: 10,
              status: "available"
            });

            await SeatService.initializeShowSeats(showDoc._id);
            totalShows++;
          }
        }
      }
    }

    console.log(`\nShowtime seeding completed successfully.`);
    console.log(`Total shows created: ${totalShows} across ${theatres.length} theatres for 7 days.`);
  } catch (error) {
    console.error("Showtime seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedShowtimes();
