import { z } from "zod";
import { apiHandler, ApiError, readJson, json } from "@/lib/api";
import { getCurrentUser } from "@/lib/currentUser";
import { itinerarySchema, shareTokenSchema } from "@/lib/schemas";
import { getSharedTrip, hashToken } from "@/lib/tripAccess";
import { rateLimit } from "@/lib/rateLimit";
import { verifyItinerary } from "@/lib/googleMaps";

export const maxDuration = 180;
export const POST = apiHandler("google.verify", async (request) => {
  const body = await readJson(request, z.union([z.object({ shareToken: shareTokenSchema }).strict(), z.object({ itinerary: itinerarySchema }).strict()]));
  let itinerary;
  if (body.shareToken) {
    await rateLimit(`shared-map:${hashToken(body.shareToken)}`, 8);
    itinerary = (await getSharedTrip(body.shareToken)).itinerary;
  } else {
    const user = await getCurrentUser();
    if (!user) throw new ApiError(401, "Authentication required.");
    await rateLimit(`verify:${user._id}`, 8);
    itinerary = body.itinerary;
  }
  const checked = await verifyItinerary(itinerary);
  return json({ days: checked.mapData });
});
