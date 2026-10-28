const mongoose = require("mongoose");
const config = require("../config/env");
const User = require("../models/User");
const Movie = require("../models/Movie");
const Theatre = require("../models/Theatre");
const Screen = require("../models/Screen");
const Show = require("../models/Show");
const ShowSeat = require("../models/ShowSeat");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Review = require("../models/Review");
const SeatService = require("../services/seatService");

const moviesData = [
  {
    title: "Dune: Part Two",
    slug: "dune-part-two",
    synopsis: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
    genres: ["Sci-Fi", "Adventure", "Action"],
    durationMinutes: 166,
    language: "English",
    releaseDate: new Date("2024-03-01"),
    releaseStatus: "now-showing",
    averageRating: 8.8,
    reviewCount: 4230,
    formats: ["IMAX 3D", "Dolby Cinema", "2D 4K"],
    director: "Denis Villeneuve",
    cast: ["Timothée Chalamet", "Zendaya", "Rebecca Ferguson", "Javier Bardem"],
    posterUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
    trailerUrl: "https://www.youtube.com/embed/Way9Dexny3w",
    featured: true
  },
  {
    title: "Oppenheimer",
    slug: "oppenheimer",
    synopsis: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.",
    genres: ["Biography", "Drama", "History"],
    durationMinutes: 180,
    language: "English",
    releaseDate: new Date("2023-07-21"),
    releaseStatus: "now-showing",
    averageRating: 8.9,
    reviewCount: 6120,
    formats: ["IMAX 70mm", "Dolby Cinema", "2D"],
    director: "Christopher Nolan",
    cast: ["Cillian Murphy", "Emily Blunt", "Matt Damon", "Robert Downey Jr."],
    posterUrl: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&auto=format&fit=crop&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1600&auto=format&fit=crop&q=80",
    trailerUrl: "https://www.youtube.com/embed/uYPbbksJxIg",
    featured: true
  },
  {
    title: "Interstellar",
    slug: "interstellar",
    synopsis: "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft along with a team of researchers.",
    genres: ["Sci-Fi", "Drama", "Adventure"],
    durationMinutes: 169,
    language: "English",
    releaseDate: new Date("2014-11-07"),
    releaseStatus: "now-showing",
    averageRating: 8.7,
    reviewCount: 8450,
    formats: ["IMAX 70mm", "Dolby Atmos", "4K Remastered"],
    director: "Christopher Nolan",
    cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain", "Michael Caine"],
    posterUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&auto=format&fit=crop&q=80",
    trailerUrl: "https://www.youtube.com/embed/zSWdZVtXT7E",
    featured: true
  },
  {
    title: "Gladiator II",
    slug: "gladiator-ii",
    synopsis: "Years after witnessing the death of Maximus at the hands of his uncle, Lucius must enter the Colosseum after the powerful emperors of Rome conquer his home.",
    genres: ["Action", "Drama", "History"],
    durationMinutes: 148,
    language: "English",
    releaseDate: new Date("2024-11-22"),
    releaseStatus: "now-showing",
    averageRating: 8.2,
    reviewCount: 1940,
    formats: ["IMAX", "Dolby Cinema", "2D"],
    director: "Ridley Scott",
    cast: ["Paul Mescal", "Pedro Pascal", "Denzel Washington", "Connie Nielsen"],
    posterUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=1600&auto=format&fit=crop&q=80",
    trailerUrl: "https://www.youtube.com/embed/4rgYUipGJNo",
    featured: false
  },
  {
    title: "Spider-Man: Beyond the Spider-Verse",
    slug: "spider-man-beyond-the-spider-verse",
    synopsis: "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.",
    genres: ["Animation", "Action", "Adventure"],
    durationMinutes: 140,
    language: "English",
    releaseDate: new Date("2025-06-27"),
    releaseStatus: "coming-soon",
    averageRating: 9.1,
    reviewCount: 3100,
    formats: ["IMAX 3D", "4DX", "Dolby Atmos"],
    director: "Joaquim Dos Santos",
    cast: ["Shameik Moore", "Hailee Steinfeld", "Oscar Isaac", "Daniel Kaluuya"],
    posterUrl: "https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&auto=format&fit=crop&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1600&auto=format&fit=crop&q=80",
    trailerUrl: "https://www.youtube.com/embed/cqGjhVJWtEg",
    featured: true
  }
];

const theatresData = [
  {
    name: "IMovies Grand Cinema",
    city: "New York",
    address: "234 W 42nd St, Times Square, New York, NY 10036",
    amenities: ["IMAX with Laser", "Dolby Atmos", "Luxury Recliner Seats", "Gourmet Dine-in"],
    screensCount: 4,
    rating: 4.8
  },
  {
    name: "IMovies Starplex & IMAX",
    city: "New York",
    address: "1998 Broadway, Upper West Side, New York, NY 10023",
    amenities: ["IMAX 70mm", "Dolby Cinema", "Full Bar & Lounge", "Heated Recliners"],
    screensCount: 4,
    rating: 4.7
  },
  {
    name: "IMovies CineDine Hollywood",
    city: "Los Angeles",
    address: "6801 Hollywood Blvd, Hollywood, CA 90028",
    amenities: ["ScreenX 270°", "4DX Motion Seats", "Dolby Atmos", "Chef-Crafted Menu"],
    screensCount: 4,
    rating: 4.9
  },
  {
    name: "IMovies Millennium Centre",
    city: "Chicago",
    address: "150 N Michigan Ave, Chicago, IL 60601",
    amenities: ["Dolby Cinema", "IMAX", "VIP Lounges", "Artisanal Popcorn Bar"],
    screensCount: 4,
    rating: 4.7
  }
];

async function seedDatabase(options = {}) {
  const currentEnv = process.env.NODE_ENV || config.nodeEnv;
  const isProduction = currentEnv === "production";
  const hasForce = process.argv.includes("--force") || options.force === true;

  if (isProduction && !hasForce) {
    const errorMsg =
      "[Seed Error] Refusing to run database seeder in production environment without explicit --force argument.";
    console.error(errorMsg);
    if (require.main === module) {
      process.exit(1);
    }
    throw new Error(errorMsg);
  }

  try {
    console.log("[Seed] Connecting to MongoDB...");
    await mongoose.connect(config.mongodbUri);
    console.log("[Seed] Connected.");

    // Clean existing data
    console.log("[Seed] Clearing old collections...");
    await Promise.all([
      User.deleteMany({}),
      Movie.deleteMany({}),
      Theatre.deleteMany({}),
      Screen.deleteMany({}),
      Show.deleteMany({}),
      ShowSeat.deleteMany({}),
      Booking.deleteMany({}),
      Payment.deleteMany({}),
      Review.deleteMany({})
    ]);

    // 1. Seed Users
    console.log("[Seed] Seeding users...");
    const adminPasswordHash = await User.hashPassword("admin123");
    const userPasswordHash = await User.hashPassword("password123");

    const admin = await User.create({
      name: "Sarah Cinema Manager",
      email: "admin@imovies.com",
      passwordHash: adminPasswordHash,
      phone: "+1 (555) 901-4422",
      role: "admin",
      status: "active"
    });

    const user1 = await User.create({
      name: "Alex Morgan",
      email: "alex@imovies.com",
      passwordHash: userPasswordHash,
      phone: "+1 (555) 349-2819",
      role: "user",
      status: "active"
    });

    const user2 = await User.create({
      name: "David Kim",
      email: "david@example.com",
      passwordHash: userPasswordHash,
      phone: "+1 (555) 789-0123",
      role: "user",
      status: "active"
    });

    console.log(`[Seed] Seeded admin (admin@imovies.com / admin123) and demo users (alex@imovies.com, david@example.com / password123).`);

    // 2. Seed Movies
    console.log("[Seed] Seeding movies...");
    const createdMovies = await Movie.create(moviesData);
    console.log(`[Seed] Seeded ${createdMovies.length} movies.`);

    // 3. Seed Theatres & Screens
    console.log("[Seed] Seeding theatres and screens...");
    const createdTheatres = [];
    const allScreens = [];

    for (const th of theatresData) {
      const theatreDoc = await Theatre.create(th);
      createdTheatres.push(theatreDoc);

      const screenTypes = ["IMAX Laser", "Dolby Atmos", "Standard 4K", "Prime 3D"];
      for (let i = 1; i <= th.screensCount; i++) {
        const scr = await Screen.create({
          theatre: theatreDoc._id,
          name: `Screen ${i} - ${screenTypes[(i - 1) % screenTypes.length]}`,
          screenType: i === 1 ? "IMAX" : i === 2 ? "Dolby Cinema" : "Standard"
        });
        allScreens.push(scr);
      }
    }
    console.log(`[Seed] Seeded ${createdTheatres.length} theatres and ${allScreens.length} screens.`);

    // 4. Seed Shows
    console.log("[Seed] Seeding shows and seat inventories...");
    const sampleTimeSlots = [
      { time: "10:30 AM", h: 10, m: 30 },
      { time: "02:45 PM", h: 14, m: 45 },
      { time: "07:00 PM", h: 19, m: 0 }
    ];

    let showCount = 0;
    const nowShowingMovies = createdMovies.filter((m) => m.releaseStatus === "now-showing");

    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() + dayOffset);
      const isoDate = dateObj.toISOString().split("T")[0];

      // Spread shows across theatres and assign movies to distinct screens without overlaps
      for (const theatre of createdTheatres.slice(0, 3)) {
        const theatreScreens = allScreens.filter((s) => s.theatre.toString() === theatre._id.toString());
        if (theatreScreens.length === 0) continue;

        for (let mIdx = 0; mIdx < nowShowingMovies.length; mIdx++) {
          const movie = nowShowingMovies[mIdx];
          // Spread movies across different screens
          const screen = theatreScreens[mIdx % theatreScreens.length];

          // Use non-overlapping daily time slots
          const slotsForMovie = (mIdx + dayOffset) % 2 === 0
            ? [sampleTimeSlots[0], sampleTimeSlots[2]] // 10:30 AM and 07:00 PM
            : [sampleTimeSlots[1]];                     // 02:45 PM

          for (const timeSlot of slotsForMovie) {
            const start = new Date(dateObj);
            start.setHours(timeSlot.h, timeSlot.m, 0, 0);
            const end = new Date(start.getTime() + (movie.durationMinutes + 30) * 60 * 1000);

            // Check conflicts with the existing hasScheduleConflict helper
            const conflict = await Show.hasScheduleConflict(screen._id, start, end);
            if (conflict) {
              console.warn(`[Seed] Schedule conflict detected for screen ${screen.name} at ${timeSlot.time}. Skipping.`);
              continue;
            }

            const showDoc = await Show.create({
              movie: movie._id,
              theatre: theatre._id,
              screen: screen._id,
              screenName: screen.name,
              startTime: start,
              endTime: end,
              time: timeSlot.time,
              date: isoDate,
              language: movie.language,
              format: screen.screenType,
              standardPrice: 15.5,
              premiumPrice: 22.0,
              vipPrice: 28.0,
              ticketFee: 1.50,
              maxSeatsPerBooking: 10,
              status: "available"
            });

            // Initialize seats
            await SeatService.initializeShowSeats(showDoc._id);
            showCount++;
          }
        }
      }
    }
    console.log(`[Seed] Seeded ${showCount} non-conflicting shows with full seat inventories.`);

    // 5. Seed sample reviews
    console.log("[Seed] Seeding sample reviews...");
    await Review.create([
      {
        user: user1._id,
        userName: user1.name,
        movie: createdMovies[0]._id,
        rating: 10,
        reviewText: "An absolute visual masterpiece! The scale and sound design are unmatched.",
        status: "approved",
        likes: 24,
        verifiedPurchase: true
      },
      {
        user: user2._id,
        userName: user2.name,
        movie: createdMovies[0]._id,
        rating: 9,
        reviewText: "Incredible direction by Denis Villeneuve. A must-watch on IMAX.",
        status: "approved",
        likes: 12,
        verifiedPurchase: true
      },
      {
        user: user1._id,
        userName: user1.name,
        movie: createdMovies[1]._id,
        rating: 10,
        reviewText: "Cillian Murphy gives the performance of a lifetime. Haunting and profound.",
        status: "approved",
        likes: 45,
        verifiedPurchase: true
      }
    ]);

    for (const movie of createdMovies) {
      await Review.calculateAverageRating(movie._id);
    }
    console.log("[Seed] Sample reviews created and ratings aggregated.");

    console.log("[Seed] Database seeding completed successfully!");
    await mongoose.disconnect();
    if (require.main === module) {
      process.exit(0);
    }
  } catch (error) {
    console.error("[Seed] Seeding failed:", error);
    if (require.main === module) {
      process.exit(1);
    }
    throw error;
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
