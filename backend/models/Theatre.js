const mongoose = require("mongoose");

const theatreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Theatre name is required"],
      trim: true,
      maxlength: [150, "Name cannot exceed 150 characters"]
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      index: true
    },
    amenities: {
      type: [String],
      default: ["Dolby Atmos", "Recliners", "Parking", "Food & Beverages"]
    },
    screensCount: {
      type: Number,
      default: 4,
      min: [1, "Must have at least 1 screen"]
    },
    rating: {
      type: Number,
      default: 4.8,
      min: 0,
      max: 5
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive"],
        message: "Status must be 'active' or 'inactive'"
      },
      default: "active"
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.location = doc.city;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.location = doc.city;
        delete ret.__v;
        return ret;
      }
    }
  }
);

theatreSchema.index({ city: 1, status: 1 });

const Theatre = mongoose.model("Theatre", theatreSchema);

module.exports = Theatre;
