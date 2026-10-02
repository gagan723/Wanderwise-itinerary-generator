import { askGemini, regenerateDay, replacementStops } from "@/lib/gemini";
import { getCurrentUser } from "@/lib/currentUser";
import { apiHandler, ApiError, json, readJson } from "@/lib/api";
import { aiRequestSchema, itinerarySchema } from "@/lib/schemas";
import { flattenDays, requestedDates, updateDay } from "@/lib/itinerary";
import { verifyItinerary } from "@/lib/googleMaps";
import { rateLimit } from "@/lib/rateLimit";

export const maxDuration = 300;
export const POST = apiHandler("gemini", async (request) => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Authentication required.");
  await rateLimit(`ai:${user._id}`, 12);
  const body = await readJson(request, aiRequestSchema);
  if (body.type === "info") return json(await askGemini(body));
  if (body.type === "day") {
    const original = flattenDays(body.itinerary).find((day) => day.day === body.day);
    if (!original) throw new ApiError(400, "Day not found in this itinerary.");
    const day = await regenerateDay(body.itinerary, original, original.city);
    const single = { title: body.itinerary.title, dates: body.itinerary.dates, locations: [{ city: original.city, days: [day.day], itinerary: [day] }] };
    const checked = await verifyItinerary(single, replacementStops);
    const updated = updateDay(body.itinerary, body.day, () => checked.locations[0].itinerary[0]);
    return json({ ...itinerarySchema.parse(updated), mapData: checked.mapData });
  }
  let result = await askGemini(body);
  const dates = requestedDates(body.context);
  const validDates = (plan) => {
    const days = flattenDays(plan);
    return days.length === dates.length && dates.every((date, i) => days[i]?.day === i + 1 && days[i]?.date === date);
  };
  if (!validDates(result)) result = await askGemini(body);
  if (!validDates(result)) throw new ApiError(502, "The generated plan did not cover every requested date.");
  result.preferences = body.context;
  return json(await verifyItinerary(result, replacementStops));
});
