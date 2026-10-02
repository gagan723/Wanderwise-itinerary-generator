import { getCurrentUser } from "@/lib/currentUser";
import Trip from "@/models/trip";
import { apiHandler, ApiError, json, readJson } from "@/lib/api";
import { persistableItinerary, saveTripSchema } from "@/lib/schemas";
import { rateLimit } from "@/lib/rateLimit";

export const GET = apiHandler("trips.list", async () => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Authentication required.");
  const trips = await Trip.find({ owner: user._id }).select("name itinerary.title itinerary.dates itinerary.locations.city createdAt updatedAt").sort({ updatedAt: -1 }).lean();
  return json({ trips });
});
export const POST = apiHandler("trips.save", async (request) => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Authentication required.");
  await rateLimit(`save:${user._id}`, 20);
  const body = await readJson(request, saveTripSchema);
  const trip = await Trip.create({ owner: user._id, name: body.name || body.itinerary.title.slice(0, 100), itinerary: persistableItinerary(body.itinerary) });
  return json({ trip }, 201);
});
