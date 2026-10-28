const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true
    },
    userName: {
      type: String,
      default: "Cinema Fan"
    },
    userAvatar: {
      type: String,
      default: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
    },
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: [true, "Movie reference is required"],
      index: true
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [10, "Rating cannot exceed 10"]
    },
    reviewText: {
      type: String,
      required: [true, "Review text is required"],
      trim: true,
      minlength: [2, "Review must be at least 2 characters"],
      maxlength: [2000, "Review cannot exceed 2000 characters"]
    },
    status: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved",
      index: true
    },
    likes: {
      type: Number,
      default: 0
    },
    verifiedPurchase: {
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
        ret.comment = ret.reviewText;
        ret.content = ret.reviewText;
        if (doc.createdAt) {
          ret.date = doc.createdAt.toISOString().split("T")[0];
        }
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.comment = ret.reviewText;
        ret.content = ret.reviewText;
        if (doc.createdAt) {
          ret.date = doc.createdAt.toISOString().split("T")[0];
        }
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Virtual for comment
reviewSchema.virtual("comment").get(function () {
  return this.reviewText;
});

reviewSchema.index({ movie: 1, createdAt: -1 });
reviewSchema.index({ user: 1, movie: 1 }, { unique: true });

// Static method to recalculate movie rating
reviewSchema.statics.calculateAverageRating = async function (movieId) {
  const stats = await this.aggregate([
    { $match: { movie: new mongoose.Types.ObjectId(movieId), status: "approved" } },
    {
      $group: {
        _id: "$movie",
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  const Movie = require("./Movie");

  if (stats.length > 0) {
    await Movie.findByIdAndUpdate(movieId, {
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      reviewCount: stats[0].reviewCount
    });
  } else {
    await Movie.findByIdAndUpdate(movieId, {
      averageRating: 0,
      reviewCount: 0
    });
  }
};

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
