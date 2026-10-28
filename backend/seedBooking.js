const crypto = require("crypto");
const mongoose = require("mongoose");

function generateBookingReference() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `IMV-${timestamp}-${random}`;
}

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      unique: true,
      default: generateBookingReference,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true
    },
    show: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Show",
      required: [true, "Show reference is required"],
      index: true
    },
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: [true, "Movie reference is required"]
    },
    theatre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Theatre",
      required: [true, "Theatre reference is required"]
    },
    screen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Screen",
      required: [true, "Screen reference is required"]
    },
    seats: [
      {
        seatIdentifier: { type: String, required: true },
        row: { type: String, required: true },
        number: { type: Number, required: true },
        seatType: { type: String, default: "standard" },
        price: { type: Number, required: true }
      }
    ],
    selectedSeats: {
      type: [String],
      default: []
    },
    ticketSubtotal: {
      type: Number,
      required: true,
      min: 0
    },
    fees: {
      type: Number,
      default: 0,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    couponCode: {
      type: String,
      trim: true,
      default: null
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "expired"],
      default: "pending",
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid", "failed", "refunded"],
      default: "unpaid",
      index: true
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null
    },
    qrCodeData: {
      type: String,
      default: ""
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    cancellationDetails: {
      reason: { type: String, default: "" },
      cancelledAt: { type: Date, default: null },
      refundAmount: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret.bookingReference || ret._id.toString();
        ret.status = ret.bookingStatus;
        if (ret.user && ret.user._id) {
          ret.userId = ret.user._id.toString();
          ret.customerName = ret.user.name;
          ret.customerEmail = ret.user.email;
          ret.customerPhone = ret.user.phone;
        } else if (ret.user && typeof ret.user === "object") {
          ret.customerName = ret.user.name;
          ret.customerEmail = ret.user.email;
          ret.customerPhone = ret.user.phone;
        } else if (ret.user) {
          ret.userId = ret.user.toString();
        }
        if (ret.movie && typeof ret.movie === "object") {
          ret.movieTitle = ret.movie.title;
          ret.moviePoster = ret.movie.posterUrl;
        }
        if (ret.theatre && typeof ret.theatre === "object") {
          ret.theatreName = ret.theatre.name;
          ret.theatreLocation = ret.theatre.city || ret.theatre.address;
        }
        if (ret.screen && typeof ret.screen === "object") {
          ret.screenName = ret.screen.name;
        }
        if (ret.show && typeof ret.show === "object") {
          ret.date = ret.show.date;
          ret.time = ret.show.time;
          ret.format = ret.show.format;
        }
        if (ret.selectedSeats && Array.isArray(ret.selectedSeats) && ret.selectedSeats.length > 0) {
          ret.seats = ret.selectedSeats;
          ret.ticketCount = ret.selectedSeats.length;
        } else if (ret.seats && Array.isArray(ret.seats)) {
          ret.seats = ret.seats.map((s) => s.seatIdentifier || s);
          ret.ticketCount = ret.seats.length;
        }
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret.bookingReference || ret._id.toString();
        ret.status = ret.bookingStatus;
        if (ret.user && ret.user._id) {
          ret.userId = ret.user._id.toString();
          ret.customerName = ret.user.name;
          ret.customerEmail = ret.user.email;
          ret.customerPhone = ret.user.phone;
        } else if (ret.user && typeof ret.user === "object") {
          ret.customerName = ret.user.name;
          ret.customerEmail = ret.user.email;
          ret.customerPhone = ret.user.phone;
        } else if (ret.user) {
          ret.userId = ret.user.toString();
        }
        if (ret.movie && typeof ret.movie === "object") {
          ret.movieTitle = ret.movie.title;
          ret.moviePoster = ret.movie.posterUrl;
        }
        if (ret.theatre && typeof ret.theatre === "object") {
          ret.theatreName = ret.theatre.name;
          ret.theatreLocation = ret.theatre.city || ret.theatre.address;
        }
        if (ret.screen && typeof ret.screen === "object") {
          ret.screenName = ret.screen.name;
        }
        if (ret.show && typeof ret.show === "object") {
          ret.date = ret.show.date;
          ret.time = ret.show.time;
          ret.format = ret.show.format;
        }
        if (ret.selectedSeats && Array.isArray(ret.selectedSeats) && ret.selectedSeats.length > 0) {
          ret.seats = ret.selectedSeats;
          ret.ticketCount = ret.selectedSeats.length;
        } else if (ret.seats && Array.isArray(ret.seats)) {
          ret.seats = ret.seats.map((s) => s.seatIdentifier || s);
          ret.ticketCount = ret.seats.length;
        }
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ show: 1, bookingStatus: 1 });
bookingSchema.index({ bookingStatus: 1, expiresAt: 1 });

bookingSchema.statics.generateReference = generateBookingReference;

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
