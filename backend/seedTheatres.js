
const mongoose = require("mongoose");
require("dotenv").config();

const Theatre = require("./models/Theatre");
const Screen = require("./models/Screen");

const CITIES = [
  {
    city: "New York",
    address: "234 W 42nd St, New York, NY",
  },
  {
    city: "Los Angeles",
    address: "6801 Hollywood Blvd, Los Angeles, CA",
  },
  {
    city: "Chicago",
    address: "100 W Randolph St, Chicago, IL",
  },
  {
    city: "London",
    address: "Leicester Square, London",
  },
  {
    city: "Toronto",
    address: "Yonge Street, Toronto, ON",
  },
  {
    city: "Mumbai",
    address: "Andheri West, Mumbai, Maharashtra",
  },
];

async function seedTheatres() {
  try {
    const mongoUri =
      process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error(
        "Missing MONGODB_URI or MONGO_URI in backend/.env"
      );
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Keep the old Indore record, but deactivate it.
    await Theatre.updateMany(
      { city: "Indore" },
      { $set: { status: "inactive" } }
    );

    for (const location of CITIES) {
      const theatreName = `IMovies Cinema - ${location.city}`;

      // Create or update one theatre per city.
      const theatre = await Theatre.findOneAndUpdate(
        { name: theatreName },
        {
          $set: {
            address: location.address,
            city: location.city,
            amenities: [
              "Dolby Atmos",
              "Recliners",
              "Parking",
              "Food & Beverages",
            ],
            screensCount: 2,
            rating: 4.8,
            status: "active",
          },
        },
        {
          returnDocument: 'after',
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

      console.log(`Theatre ready: ${theatre.name}`);

      // Create or reactivate two screens for each theatre.
      for (const name of ["Screen 1", "Screen 2"]) {
        await Screen.findOneAndUpdate(
          {
            theatre: theatre._id,
            name,
          },
          {
            $set: {
              screenType: "Standard",
              capacity: 108,
              status: "active",
            },
          },
          {
            returnDocument: 'after',
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true,
          }
        );

        console.log(`${location.city}: ${name} ready`);
      }
    }

    console.log("\nTheatre seeding completed.");
    console.log(`Active cities configured: ${CITIES.length}`);
    console.log(`Screens configured: ${CITIES.length * 2}`);
  } catch (error) {
    console.error("Theatre seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedTheatres();
