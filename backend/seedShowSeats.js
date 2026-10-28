
const mongoose = require("mongoose");
require("dotenv").config();

const Show = require("./models/Show");
const ShowSeat = require("./models/ShowSeat");

async function seedShowSeats() {
  try {
    const mongoUri =
      process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error("Missing MONGODB_URI in backend/.env");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const shows = await Show.find({ status: "available" });

    if (shows.length === 0) {
      throw new Error(
        "No available shows found. Run your movie, theatre, and showtime seeders first."
      );
    }

    let createdSeats = 0;

    for (const show of shows) {
      const existingSeats = await ShowSeat.countDocuments({
        show: show._id
      });

      // Avoid creating duplicate seats for a show.
      if (existingSeats > 0) {
        console.log(
          `Skipping show ${show._id}: ${existingSeats} seats already exist.`
        );
        continue;
      }

      const seats = [];

      // Demo layout: 5 rows × 10 seats = 50 seats per show.
      for (const row of ["A", "B", "C", "D", "E"]) {
        for (let number = 1; number <= 10; number++) {
          let seatType = "standard";
          let price = show.standardPrice ?? 15.5;

          if (["D", "E"].includes(row)) {
            seatType = "premium";
            price = show.premiumPrice ?? 22;
          }

          if (row === "E" && number >= 8) {
            seatType = "vip";
            price = show.vipPrice ?? 28;
          }

          seats.push({
            show: show._id,
            seatIdentifier: `${row}${number}`,
            row,
            seatNumber: number,
            seatType,
            price,
            status: "available"
          });
        }
      }

      await ShowSeat.insertMany(seats, { ordered: true });
      createdSeats += seats.length;

      console.log(
        `Created ${seats.length} seats for show ${show._id}`
      );
    }

    console.log(
      `Seat seeding completed. Created ${createdSeats} seats across ${shows.length} shows checked.`
    );
  } catch (error) {
    console.error("Seat seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedShowSeats();
