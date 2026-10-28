
const mongoose = require("mongoose");
require("dotenv").config();

const Movie = require("./models/Movie");

const movies = [
  {
    title: "Dune: Part Two",
    synopsis: "Paul Atreides joins Chani and the Fremen while seeking justice and confronting his destiny on Arrakis.",
    posterUrl: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    genres: ["Sci-Fi", "Adventure", "Drama"],
    language: "English",
    durationMinutes: 166,
    releaseDate: "2024-03-01",
    releaseStatus: "now-showing",
    director: "Denis Villeneuve",
    cast: ["Timothée Chalamet", "Zendaya", "Rebecca Ferguson"],
    averageRating: 8.5,
    reviewCount: 1200,
    formats: ["2D", "IMAX"],
    featured: true
  },
  {
    title: "Interstellar",
    synopsis: "A team of explorers travels beyond this galaxy to discover whether mankind has a future among the stars.",
    posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
    genres: ["Sci-Fi", "Adventure", "Drama"],
    language: "English",
    durationMinutes: 169,
    releaseDate: "2014-11-07",
    releaseStatus: "now-showing",
    director: "Christopher Nolan",
    cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"],
    averageRating: 8.7,
    reviewCount: 2500,
    formats: ["2D", "IMAX"],
    featured: true
  },
  {
    title: "Inception",
    synopsis: "A skilled thief who steals secrets through dreams is offered a chance to erase his criminal history.",
    posterUrl: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
    genres: ["Action", "Sci-Fi", "Thriller"],
    language: "English",
    durationMinutes: 148,
    releaseDate: "2010-07-16",
    releaseStatus: "now-showing",
    director: "Christopher Nolan",
    cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page"],
    averageRating: 8.8,
    reviewCount: 3000,
    formats: ["2D", "IMAX"],
    featured: true
  },
  {
    title: "The Dark Knight",
    synopsis: "Batman faces the Joker, a criminal mastermind who threatens Gotham City with escalating chaos.",
    posterUrl: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/hqkIcbrOHL86UncnHIsHVcVmzue.jpg",
    genres: ["Action", "Crime", "Drama"],
    language: "English",
    durationMinutes: 152,
    releaseDate: "2008-07-18",
    releaseStatus: "now-showing",
    director: "Christopher Nolan",
    cast: ["Christian Bale", "Heath Ledger", "Gary Oldman"],
    averageRating: 9.0,
    reviewCount: 3500,
    formats: ["2D", "IMAX"],
    featured: true
  },
  {
    title: "Spider-Man: Across the Spider-Verse",
    synopsis: "Miles Morales encounters a team of Spider-People protecting the multiverse and faces an impossible choice.",
    posterUrl: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg",
    genres: ["Animation", "Action", "Adventure"],
    language: "English",
    durationMinutes: 140,
    releaseDate: "2023-06-02",
    releaseStatus: "now-showing",
    director: "Joaquim Dos Santos",
    cast: ["Shameik Moore", "Hailee Steinfeld", "Oscar Isaac"],
    averageRating: 8.6,
    reviewCount: 1500,
    formats: ["2D", "IMAX"],
    featured: false
  },
  {
    title: "Jawan",
    synopsis: "A man driven by a personal mission confronts corruption and challenges powerful forces.",
    posterUrl: "https://image.tmdb.org/t/p/w500/jFt1gS4BGHlK8xt76Y81Alp4dbt.jpg",
    backdropUrl: "",
    genres: ["Action", "Thriller"],
    language: "Hindi",
    durationMinutes: 169,
    releaseDate: "2023-09-07",
    releaseStatus: "now-showing",
    director: "Atlee",
    cast: ["Shah Rukh Khan", "Nayanthara", "Vijay Sethupathi"],
    averageRating: 7.5,
    reviewCount: 900,
    formats: ["2D"],
    featured: false
  },
  {
    title: "Kantara",
    synopsis: "A village land dispute becomes entwined with local traditions, spiritual beliefs and a mysterious force.",
    posterUrl: "https://image.tmdb.org/t/p/w500/4aR8Z5F4s4S7s4Y6S4s4S4s4S4s.jpg",
    backdropUrl: "",
    genres: ["Action", "Drama", "Thriller"],
    language: "Kannada",
    durationMinutes: 148,
    releaseDate: "2022-09-30",
    releaseStatus: "now-showing",
    director: "Rishab Shetty",
    cast: ["Rishab Shetty", "Sapthami Gowda", "Kishore"],
    averageRating: 8.2,
    reviewCount: 700,
    formats: ["2D"],
    featured: false
  },
  {
    title: "Pushpa: The Rise",
    synopsis: "A labourer rises through the ranks of a red sandalwood smuggling network.",
    posterUrl: "https://image.tmdb.org/t/p/w500/r1yAzVQNbCbPTbB3GZFour9hVJd.jpg",
    backdropUrl: "",
    genres: ["Action", "Crime", "Drama"],
    language: "Telugu",
    durationMinutes: 179,
    releaseDate: "2021-12-17",
    releaseStatus: "now-showing",
    director: "Sukumar",
    cast: ["Allu Arjun", "Rashmika Mandanna", "Fahadh Faasil"],
    averageRating: 7.6,
    reviewCount: 850,
    formats: ["2D"],
    featured: false
  }
];

async function seedMovies() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error("MongoDB URI not found in backend/.env");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Safe to rerun: update matching titles, insert missing titles.
    for (const movie of movies) {
      const { title, ...fields } = movie;

    

const slug = title
  .toLowerCase()
  .trim()
  .replace(/\s+/g, "-")
  .replace(/[^\w-]+/g, "")
  .replace(/-+/g, "-");

await Movie.updateOne(
  { title },
  {
    $set: {
      ...fields,
      title,
      slug
    }
  },
  {
    upsert: true,
    runValidators: true
  }
);
    }

    console.log(`Seed completed: ${movies.length} movies processed.`);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedMovies();
