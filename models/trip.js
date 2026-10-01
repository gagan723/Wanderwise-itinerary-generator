import mongoose from "mongoose";

const TripSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    itinerary: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

TripSchema.index({ owner: 1, updatedAt: -1 });

const Trip = mongoose.models.Trip || mongoose.model("Trip", TripSchema);

export default Trip;
