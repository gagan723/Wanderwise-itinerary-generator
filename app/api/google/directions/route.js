import { z } from "zod";
import { apiHandler, ApiError, readJson, json } from "@/lib/api";
import { getCurrentUser } from "@/lib/currentUser";
import { directionsSchema, shareTokenSchema } from "@/lib/schemas";
import { getSharedTrip, hashToken } from "@/lib/tripAccess";
import { rateLimit } from "@/lib/rateLimit";
import { getDirections, verifyItinerary } from "@/lib/googleMaps";
import { flattenDays } from "@/lib/itinerary";

export const maxDuration = 180;
export const POST = apiHandler("google.directions", async (request) => {
  const body = await readJson(request, z.union([z.object({ shareToken: shareTokenSchema, day: z.number().int().min(1).max(14) }).strict(), directionsSchema.strict()]));
  let coordinates, profile;
  if (body.shareToken) {
    await rateLimit(`shared-directions:${hashToken(body.shareToken)}`, 30);
    const { itinerary } = await getSharedTrip(body.shareToken);
    const day = flattenDays(itinerary).find((entry) => entry.day === body.day);
    if (!day) throw new ApiError(404, "Day not found.");
    const checked = await verifyItinerary({ ...itinerary, locations: [{ city: day.city, itinerary: [day], days: [day.day] }] });
    coordinates = checked.mapData[0].stops.filter((stop) => stop.coordinates).map((stop) => stop.coordinates);
    profile = day.transportMode;
    if (coordinates.length < 2) throw new ApiError(422, "At least two verified stops are needed for a route.");
  } else {
    const user = await getCurrentUser();
    if (!user) throw new ApiError(401, "Authentication required.");
    await rateLimit(`directions:${user._id}`, 60);
    ({ coordinates, profile } = body);
  }
  return json(await getDirections(coordinates, profile));
});
