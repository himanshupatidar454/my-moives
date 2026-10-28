const mongoose = require("mongoose");
const Movie = require("../models/Movie");
const ApiResponse = require("../utils/apiResponse");
const escapeRegex = require("../utils/escapeRegex");

const movieController = {
  // GET /api/movies
  getMovies: async (req, res, next) => {
    try {
      const {
        search,
        genre,
        language,
        status,
        sortBy = "popularity",
        page = 1,
        limit = 50
      } = req.query;

      const filter = {};

      if (search && search.trim()) {
        const q = escapeRegex(search.trim());
        filter.$or = [
          { title: { $regex: q, $options: "i" } },
          { synopsis: { $regex: q, $options: "i" } },
          { director: { $regex: q, $options: "i" } }
        ];
      }

      if (genre && genre !== "All") {
        const escapedGenre = escapeRegex(genre.trim());
        filter.genres = { $in: [new RegExp(`^${escapedGenre}$`, "i")] };
      }

      if (language && language !== "All") {
        const escapedLanguage = escapeRegex(language.trim());
        filter.language = { $regex: `^${escapedLanguage}$`, $options: "i" };
      }

      if (status && status !== "all") {
        const normalizedStatus = typeof status === "string" ? status.replace("_", "-") : status;
        filter.releaseStatus = normalizedStatus;
      }

      let sortOptions = {};
      if (sortBy === "rating") {
        sortOptions = { averageRating: -1, reviewCount: -1 };
      } else if (sortBy === "releaseDate") {
        sortOptions = { releaseDate: -1 };
      } else if (sortBy === "title") {
        sortOptions = { title: 1 };
      } else {
        // default: popularity / rating
        sortOptions = { averageRating: -1, reviewCount: -1, _id: -1 };
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      const [movies, total] = await Promise.all([
        Movie.find(filter).sort(sortOptions).skip(skip).limit(limitNum),
        Movie.countDocuments(filter)
      ]);

      const formattedMovies = movies.map((m) => m.toJSON());

      return ApiResponse.success(res, "Movies retrieved successfully", {
        movies: formattedMovies,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/movies/:id (or slug)
  getMovieById: async (req, res, next) => {
    try {
      const { id } = req.params;

      let movie = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        movie = await Movie.findById(id);
      }

      if (!movie) {
        movie = await Movie.findOne({ slug: id.toLowerCase().trim() });
      }

      if (!movie) {
        return ApiResponse.error(res, "Movie not found", [], 404);
      }

      return ApiResponse.success(res, "Movie retrieved successfully", {
        movie: movie.toJSON()
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/movies/featured
  getFeaturedMovies: async (req, res, next) => {
    try {
      const movies = await Movie.find({
        $or: [{ featured: true }, { averageRating: { $gte: 8.5 } }]
      }).limit(10);

      return ApiResponse.success(res, "Featured movies retrieved successfully", {
        movies: movies.map((m) => m.toJSON())
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/movies/now-showing
  getNowShowing: async (req, res, next) => {
    try {
      const movies = await Movie.find({ releaseStatus: "now-showing" }).sort({ releaseDate: -1 });

      return ApiResponse.success(res, "Now showing movies retrieved successfully", {
        movies: movies.map((m) => m.toJSON())
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/movies/coming-soon
  getComingSoon: async (req, res, next) => {
    try {
      const movies = await Movie.find({ releaseStatus: "coming-soon" }).sort({ releaseDate: 1 });

      return ApiResponse.success(res, "Coming soon movies retrieved successfully", {
        movies: movies.map((m) => m.toJSON())
      });
    } catch (error) {
      next(error);
    }
  },

  // Admin: POST /api/admin/movies (or /api/movies)
  createMovie: async (req, res, next) => {
    try {
      const {
        title,
        slug,
        synopsis,
        posterUrl,
        backdropUrl,
        genres,
        genre,
        language,
        durationMinutes,
        duration,
        releaseDate,
        releaseStatus,
        status,
        director,
        cast,
        crew,
        trailerUrl,
        formats,
        featured,
        rating
      } = req.body;

      // Normalize genres / genre
      let parsedGenres = [];
      if (Array.isArray(genres)) {
        parsedGenres = genres;
      } else if (Array.isArray(genre)) {
        parsedGenres = genre;
      } else if (typeof genre === "string") {
        parsedGenres = genre.split(",").map((s) => s.trim()).filter(Boolean);
      } else if (typeof genres === "string") {
        parsedGenres = genres.split(",").map((s) => s.trim()).filter(Boolean);
      }

      if (parsedGenres.length === 0) {
        parsedGenres = ["Action"];
      }

      const movieDuration = Number(durationMinutes || duration || 120);
      const movieStatus = releaseStatus || status || "now-showing";

      const newMovie = await Movie.create({
        title: title ? title.trim() : "",
        slug: slug ? slug.trim().toLowerCase() : undefined,
        synopsis: synopsis ? synopsis.trim() : "",
        posterUrl: posterUrl ? posterUrl.trim() : "",
        backdropUrl: backdropUrl ? backdropUrl.trim() : "",
        genres: parsedGenres,
        language: language || "English",
        durationMinutes: movieDuration,
        releaseDate: releaseDate ? new Date(releaseDate) : new Date(),
        releaseStatus: movieStatus,
        director: director || "",
        cast: Array.isArray(cast) ? cast : [],
        crew: Array.isArray(crew) ? crew : [],
        trailerUrl: trailerUrl || "",
        formats: Array.isArray(formats) ? formats : ["2D", "IMAX"],
        featured: Boolean(featured),
        averageRating: 0,
        reviewCount: 0
      });

      return ApiResponse.success(
        res,
        "Movie created successfully",
        { movie: newMovie.toJSON() },
        201
      );
    } catch (error) {
      next(error);
    }
  },

  // Admin: PATCH/PUT /api/admin/movies/:id (or /api/movies/:id)
  updateMovie: async (req, res, next) => {
    try {
      const { id } = req.params;

      let movie = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        movie = await Movie.findById(id);
      }
      if (!movie) {
        movie = await Movie.findOne({ slug: id.toLowerCase().trim() });
      }

      if (!movie) {
        return ApiResponse.error(res, "Movie not found", [], 404);
      }

      // Explicit allow-list of editable fields
      const ALLOWED_FIELDS = [
        "title",
        "slug",
        "synopsis",
        "posterUrl",
        "backdropUrl",
        "genres",
        "genre",
        "language",
        "durationMinutes",
        "duration",
        "releaseDate",
        "releaseStatus",
        "status",
        "director",
        "cast",
        "crew",
        "trailerUrl",
        "formats",
        "featured"
      ];

      const updates = {};
      for (const field of ALLOWED_FIELDS) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      // Map frontend aliases if present
      if (updates.genre !== undefined && updates.genres === undefined) {
        updates.genres = Array.isArray(updates.genre)
          ? updates.genre
          : typeof updates.genre === "string"
            ? updates.genre.split(",").map((s) => s.trim()).filter(Boolean)
            : [updates.genre];
        delete updates.genre;
      } else if (typeof updates.genres === "string") {
        updates.genres = updates.genres.split(",").map((s) => s.trim()).filter(Boolean);
      }

      if (updates.duration !== undefined && updates.durationMinutes === undefined) {
        updates.durationMinutes = Number(updates.duration);
        delete updates.duration;
      }

      if (updates.status !== undefined && updates.releaseStatus === undefined) {
        updates.releaseStatus = updates.status.replace("_", "-");
        delete updates.status;
      } else if (typeof updates.releaseStatus === "string") {
        updates.releaseStatus = updates.releaseStatus.replace("_", "-");
      }

      if (updates.releaseDate !== undefined) {
        updates.releaseDate = new Date(updates.releaseDate);
      }

      // Ratings and review counts must never be editable this way
      delete updates.averageRating;
      delete updates.reviewCount;
      delete updates.rating;
      delete updates.voteCount;
      delete updates.ratingCount;

      Object.assign(movie, updates);
      await movie.save();

      return ApiResponse.success(res, "Movie updated successfully", {
        movie: movie.toJSON()
      });
    } catch (error) {
      next(error);
    }
  },

  // Admin: DELETE /api/admin/movies/:id (or /api/movies/:id)
  deleteMovie: async (req, res, next) => {
    try {
      const { id } = req.params;
      const Show = require("../models/Show");
      const Booking = require("../models/Booking");

      let movie = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        movie = await Movie.findById(id);
      }
      if (!movie) {
        movie = await Movie.findOne({ slug: id.toLowerCase().trim() });
      }

      if (!movie) {
        return ApiResponse.error(res, "Movie not found", [], 404);
      }

      // Block delete if future shows or confirmed bookings exist to prevent orphaned data
      const now = new Date();
      const [futureShowsCount, confirmedBookingsCount] = await Promise.all([
        Show.countDocuments({
          movie: movie._id,
          startTime: { $gt: now },
          status: { $ne: "cancelled" }
        }),
        Booking.countDocuments({
          movie: movie._id,
          bookingStatus: "confirmed"
        })
      ]);

      if (futureShowsCount > 0 || confirmedBookingsCount > 0) {
        return ApiResponse.error(
          res,
          `Cannot delete movie with ${futureShowsCount} upcoming show(s) or ${confirmedBookingsCount} confirmed booking(s). Archive the movie instead.`,
          [],
          400
        );
      }

      await Movie.findByIdAndDelete(movie._id);

      return ApiResponse.success(res, "Movie deleted successfully", {
        id: movie._id.toString()
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = movieController;
