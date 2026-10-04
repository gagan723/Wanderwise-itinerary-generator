import { askGemini, generateTripOutline, regenerateDayOutline, selectVerifiedItinerary } from "@/lib/gemini";
import { getCurrentUser } from "@/lib/currentUser";
import { apiHandler, ApiError, json, readJson } from "@/lib/api";
import { aiRequestSchema, itinerarySchema } from "@/lib/schemas";
import { flattenDays, requestedDates, updateDay } from "@/lib/itinerary";
import { discoverPlaces, hydrateVerifiedItinerary } from "@/lib/googleMaps";
import { rateLimit } from "@/lib/rateLimit";

export const maxDuration = 300;

async function discoverForOutline(outline, preferences, excludedIds = []) {
  const candidatesByCity = new Map();
  const daysByCity = new Map();
  for (const location of outline.locations) daysByCity.set(location.city, (daysByCity.get(location.city) || 0) + location.itinerary.length);
  for (const [city, dayCount] of daysByCity) {
    candidatesByCity.set(city, await discoverPlaces(city, preferences.interests, preferences.pace, dayCount, excludedIds));
  }
  return candidatesByCity;
}

export const POST = apiHandler("gemini", async (request) => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Authentication required.");
  await rateLimit(`ai:${user._id}`, 12);
  const body = await readJson(request, aiRequestSchema);
  if (body.type === "info") return json(await askGemini(body));
  if (body.type === "day") {
    const original = flattenDays(body.itinerary).find((day) => day.day === body.day);
    if (!original) throw new ApiError(400, "Day not found in this itinerary.");
    const day = await regenerateDayOutline(body.itinerary, original, original.city);
    const outline = { title: body.itinerary.title, dates: body.itinerary.dates, locations: [{ city: original.city, days: [day.day], itinerary: [day] }] };
    const excludedIds = flattenDays(body.itinerary).filter((entry) => entry.day !== body.day).flatMap((entry) => entry.stops.map((stop) => stop.placeId).filter(Boolean));
    const candidates = await discoverForOutline(outline, body.itinerary.preferences || { interests: "popular attractions", pace: "balanced" }, excludedIds);
    const selected = await selectVerifiedItinerary(outline, candidates, body.itinerary.preferences || {});
    const checked = hydrateVerifiedItinerary(selected, candidates);
    const updated = updateDay(body.itinerary, body.day, () => checked.locations[0].itinerary[0]);
    return json({ ...itinerarySchema.parse(updated), mapData: checked.mapData });
  }
  let outline = await generateTripOutline(body.context);
  const dates = requestedDates(body.context);
  const validDates = (plan) => {
    const days = flattenDays(plan);
    return days.length === dates.length && dates.every((date, i) => days[i]?.day === i + 1 && days[i]?.date === date);
  };
  if (!validDates(outline)) outline = await generateTripOutline(body.context);
  if (!validDates(outline)) throw new ApiError(502, "The generated plan did not cover every requested date.");
  const candidates = await discoverForOutline(outline, body.context);
  const result = await selectVerifiedItinerary(outline, candidates, body.context);
  result.preferences = body.context;
  return json(hydrateVerifiedItinerary(itinerarySchema.parse(result), candidates));
});
