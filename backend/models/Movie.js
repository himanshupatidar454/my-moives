const mongoose = require("mongoose");

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Movie title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"]
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    },
    synopsis: {
      type: String,
      required: [true, "Synopsis is required"],
      trim: true
    },
    posterUrl: {
      type: String,
      required: [true, "Poster URL is required"],
      trim: true
    },
    backdropUrl: {
      type: String,
      trim: true,
      default: ""
    },
    genres: {
      type: [String],
      required: [true, "At least one genre is required"],
      default: []
    },
    language: {
      type: String,
      required: [true, "Language is required"],
      trim: true,
      default: "English"
    },
    durationMinutes: {
      type: Number,
      required: [true, "Duration in minutes is required"],
      min: [1, "Duration must be at least 1 minute"]
    },
    releaseDate: {
      type: Date,
      required: [true, "Release date is required"]
    },
    releaseStatus: {
      type: String,
      enum: {
        values: ["now-showing", "coming-soon", "archived"],
        message: "Status must be 'now-showing', 'coming-soon', or 'archived'"
      },
      default: "now-showing"
    },
    director: {
      type: String,
      trim: true,
      default: ""
    },
    cast: {
      type: [String],
      default: []
    },
    crew: {
      type: [String],
      default: []
    },
    trailerUrl: {
      type: String,
      trim: true,
      default: ""
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 10
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0
    },
    formats: {
      type: [String],
      default: ["2D", "IMAX"]
    },
    featured: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        // Support frontend property expectations
        ret.genre = ret.genres;
        ret.duration = ret.durationMinutes;
        ret.rating = ret.averageRating;
        ret.voteCount = ret.reviewCount;
        ret.status = ret.releaseStatus;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.genre = ret.genres;
        ret.duration = ret.durationMinutes;
        ret.rating = ret.averageRating;
        ret.voteCount = ret.reviewCount;
        ret.status = ret.releaseStatus;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Virtuals for frontend convenience
movieSchema.virtual("genre").get(function () {
  return this.genres;
});

movieSchema.virtual("duration").get(function () {
  return this.durationMinutes;
});

movieSchema.virtual("rating").get(function () {
  return this.averageRating;
});

movieSchema.virtual("status").get(function () {
  return this.releaseStatus;
});

movieSchema.virtual("durationFormatted").get(function () {
  const hours = Math.floor(this.durationMinutes / 60);
  const minutes = this.durationMinutes % 60;
  return `${hours}h ${minutes}m`;
});

// Indexes for high performance querying
movieSchema.index({ releaseStatus: 1, releaseDate: -1 });
movieSchema.index({ genres: 1 });
movieSchema.index({ language: 1 });
movieSchema.index({ averageRating: -1 });
movieSchema.index(
  {
    title: "text",
    synopsis: "text",
    director: "text"
  },
  {
    default_language: "english",
    language_override: "none"
  }
);

// Pre-save hook to ensure slug is always set
movieSchema.pre("validate", function () {
  if (this.title && !this.slug) {
    this.slug = slugify(this.title);
  }
});

const Movie = mongoose.model("Movie", movieSchema);

module.exports = Movie;
