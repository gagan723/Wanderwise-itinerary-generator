import { createHash, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { getCurrentUser } from "./currentUser";
import connectToDatabase from "./mongodb";
import Trip from "@/models/trip";
import { ApiError } from "./api";
import { persistableItinerary, shareTokenSchema } from "./schemas";

export const hashToken = (token) => createHash("sha256").update(token).digest("hex");
export function newShareToken() { const token = randomBytes(32).toString("hex"); return { token, hash: hashToken(token) }; }
export async function ownedTripQuery(id) {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Authentication required.");
  if (!/^[a-f0-9]{24}$/i.test(id) || !mongoose.isValidObjectId(id)) throw new ApiError(404, "Trip not found.");
  return { _id: id, owner: user._id };
}
export async function getSharedTrip(token) {
  if (!shareTokenSchema.safeParse(token).success) throw new ApiError(404, "Shared trip not found.");
  await connectToDatabase();
  const trip = await Trip.findOne({ shareTokenHash: hashToken(token) }).select("name itinerary").lean();
  if (!trip) throw new ApiError(404, "This link is invalid or sharing has been revoked.");
  return { name: trip.name, itinerary: persistableItinerary(trip.itinerary) };
}
