const mongoose = require("mongoose");

const showSchema = new mongoose.Schema(
  {
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: [true, "Movie reference is required"],
      index: true
    },
    theatre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Theatre",
      required: [true, "Theatre reference is required"],
      index: true
    },
    screen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Screen",
      required: [true, "Screen reference is required"],
      index: true
    },
    screenName: {
      type: String,
      trim: true,
      default: "Screen 1"
    },
    startTime: {
      type: Date,
      required: [true, "Start time is required"]
    },
    endTime: {
      type: Date,
      required: [true, "End time is required"]
    },
    time: {
      type: String,
      trim: true,
      default: "06:00 PM"
    },
    date: {
      type: String,
      trim: true,
      index: true
    },
    language: {
      type: String,
      default: "English"
    },
    format: {
      type: String,
      default: "2D 4K"
    },
    standardPrice: {
      type: Number,
      required: [true, "Standard seat price is required"],
      min: [1, "Price must be at least 1"]
    },
    premiumPrice: {
      type: Number,
      required: [true, "Premium seat price is required"],
      min: [1, "Price must be at least 1"]
    },
    vipPrice: {
      type: Number,
      default: 28.00
    },
    ticketFee: {
      type: Number,
      default: 1.50
    },
    maxSeatsPerBooking: {
      type: Number,
      default: 10
    },
    status: {
      type: String,
      enum: ["available", "filling_fast", "almost_full", "sold_out", "cancelled", "completed"],
      default: "available"
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        // Frontend compatibility helpers
        if (doc.movie && typeof doc.movie === "object" && doc.movie._id) {
          ret.movieId = doc.movie._id.toString();
        } else if (doc.movie) {
          ret.movieId = doc.movie.toString();
        }
        if (doc.theatre && typeof doc.theatre === "object" && doc.theatre._id) {
          ret.theatreId = doc.theatre._id.toString();
        } else if (doc.theatre) {
          ret.theatreId = doc.theatre.toString();
        }
        if (doc.screen && typeof doc.screen === "object" && doc.screen._id) {
          ret.screenId = doc.screen._id.toString();
        } else if (doc.screen) {
          ret.screenId = doc.screen.toString();
        }
        ret.ticketFee = doc.ticketFee ?? 1.50;
        ret.maxSeatsPerBooking = doc.maxSeatsPerBooking ?? 10;
        ret.pricing = {
          standardPrice: ret.standardPrice,
          premiumPrice: ret.premiumPrice,
          vipPrice: ret.vipPrice ?? 28.00,
          ticketFee: ret.ticketFee,
          maxSeatsPerBooking: ret.maxSeatsPerBooking
        };
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        if (doc.movie && typeof doc.movie === "object" && doc.movie._id) {
          ret.movieId = doc.movie._id.toString();
        } else if (doc.movie) {
          ret.movieId = doc.movie.toString();
        }
        if (doc.theatre && typeof doc.theatre === "object" && doc.theatre._id) {
          ret.theatreId = doc.theatre._id.toString();
        } else if (doc.theatre) {
          ret.theatreId = doc.theatre.toString();
        }
        if (doc.screen && typeof doc.screen === "object" && doc.screen._id) {
          ret.screenId = doc.screen._id.toString();
        } else if (doc.screen) {
          ret.screenId = doc.screen.toString();
        }
        ret.ticketFee = doc.ticketFee ?? 1.50;
        ret.maxSeatsPerBooking = doc.maxSeatsPerBooking ?? 10;
        ret.pricing = {
          standardPrice: ret.standardPrice,
          premiumPrice: ret.premiumPrice,
          vipPrice: ret.vipPrice ?? 28.00,
          ticketFee: ret.ticketFee,
          maxSeatsPerBooking: ret.maxSeatsPerBooking
        };
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes
showSchema.index({ screen: 1, startTime: 1, endTime: 1 });
showSchema.index({ movie: 1, date: 1 });
showSchema.index({ theatre: 1, date: 1 });

// Helper to check screen schedule conflict
showSchema.statics.hasScheduleConflict = async function (screenId, startTime, endTime, excludeShowId = null) {
  const query = {
    screen: screenId,
    status: { $ne: "cancelled" },
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }
    ]
  };

  if (excludeShowId) {
    query._id = { $ne: excludeShowId };
  }

  const conflictingShow = await this.findOne(query);
  return Boolean(conflictingShow);
};

const Show = mongoose.model("Show", showSchema);

module.exports = Show;
