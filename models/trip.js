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
    shareTokenHash: { type: String, select: false },
  },
  { timestamps: true }
);

TripSchema.index({ owner: 1, updatedAt: -1 });
TripSchema.index({ shareTokenHash: 1 }, { unique: true, sparse: true });

const Trip = mongoose.models.Trip || mongoose.model("Trip", TripSchema);

export default Trip;
