import Trip from "@/models/trip";
import { ownedTripQuery, newShareToken } from "@/lib/tripAccess";
import { apiHandler, ApiError, json, readJson } from "@/lib/api";
import { persistableItinerary, updateTripSchema } from "@/lib/schemas";
import { rateLimit } from "@/lib/rateLimit";

function ownerView(trip) {
  const { shareTokenHash, ...safe } = trip;
  return { ...safe, itinerary: persistableItinerary(safe.itinerary), sharingEnabled: Boolean(shareTokenHash) };
}
export const GET = apiHandler("trips.get", async (_request, { params }) => {
  const query = await ownedTripQuery((await params).id);
  const trip = await Trip.findOne(query).select("+shareTokenHash").lean();
  if (!trip) throw new ApiError(404, "Trip not found.");
  return json({ trip: ownerView(trip) });
});
export const PATCH = apiHandler("trips.update", async (request, { params }) => {
  const query = await ownedTripQuery((await params).id);
  await rateLimit(`update:${query.owner}`, 40);
  const body = await readJson(request, updateTripSchema), changes = {}, update = {};
  if (body.name !== undefined) changes.name = body.name;
  if (body.itinerary) changes.itinerary = persistableItinerary(body.itinerary);
  let token;
  if (body.sharing === true) {
    const created = newShareToken(); token = created.token; changes.shareTokenHash = created.hash;
  } else if (body.sharing === false) update.$unset = { shareTokenHash: 1 };
  if (Object.keys(changes).length) update.$set = changes;
  const trip = await Trip.findOneAndUpdate(query, update, { new: true, runValidators: true }).select("+shareTokenHash").lean();
  if (!trip) throw new ApiError(404, "Trip not found.");
  return json({ trip: ownerView(trip), ...(token ? { shareToken: token } : {}) });
});
export const DELETE = apiHandler("trips.delete", async (_request, { params }) => {
  const query = await ownedTripQuery((await params).id);
  const trip = await Trip.findOneAndDelete(query).lean();
  if (!trip) throw new ApiError(404, "Trip not found.");
  return json({ message: "Trip deleted." });
});
