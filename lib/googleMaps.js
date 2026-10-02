import { ApiError } from "./api";
import { coordinateSchema } from "./schemas";
import { stopKey } from "./itinerary";
import { rateLimit } from "./rateLimit";

async function googleFetch(url, body, fieldMask) {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key) throw new ApiError(503, "Map verification is not configured.");
  await rateLimit("google-maps:provider:minute", 240, 60000);
  const response = await fetch(url, {
    method: "POST", body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(12000),
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": fieldMask },
  });
  if (!response.ok) throw new ApiError(502, "Google Maps is temporarily unavailable.");
  return response.json();
}
const normalize = (value) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export function matchesPlace(stop, city, place) {
  if (!place.id || place.businessStatus === "CLOSED_PERMANENTLY" || !coordinateSchema.safeParse([place.location?.longitude, place.location?.latitude]).success) return false;
  const name = normalize(stop.name), candidate = normalize(place.displayName?.text || "");
  const words = new Set(name.split(" ")), candidateWords = new Set(candidate.split(" "));
  const overlap = [...words].filter((word) => candidateWords.has(word)).length;
  const nameMatches = name === candidate || overlap / new Set([...words, ...candidateWords]).size >= 0.8;
  if (place.types?.some((type) => ["locality", "country", "administrative_area_level_1", "administrative_area_level_2"].includes(type))) return false;
  const locality = normalize(city.split(",")[0]);
  const context = normalize([place.formattedAddress, ...(place.addressComponents || []).flatMap((part) => [part.longText, part.shortText])].filter(Boolean).join(" "));
  return nameMatches && locality.length > 0 && (` ${context} `).includes(` ${locality} `);
}
export async function resolveStop(stop, city) {
  const data = await googleFetch("https://places.googleapis.com/v1/places:searchText", {
    textQuery: `${stop.name}, ${stop.address || city}, ${city}`.slice(0, 600), pageSize: 5, languageCode: "en",
  }, "places.id,places.displayName,places.formattedAddress,places.addressComponents,places.location,places.businessStatus,places.attributions,places.types");
  const place = data.places?.find((entry) => matchesPlace(stop, city, entry));
  return place ? { ...stop, status: "verified", coordinates: [place.location.longitude, place.location.latitude], resolvedAddress: place.formattedAddress || "", placeId: place.id, attributions: place.attributions || [] }
    : { ...stop, status: "unresolved", coordinates: null, reason: "No confident attraction match in this city. Check the place before visiting." };
}
export async function verifyItinerary(itinerary, replace) {
  const result = structuredClone(itinerary), days = [], cache = new Map();
  const deadline = Date.now() + 90000;
  let serviceUnavailable = false;
  async function resolve(stop, city) {
    const key = stopKey(stop, city);
    if (!cache.has(key)) {
      try {
        if (serviceUnavailable || Date.now() > deadline) throw new ApiError(503, "Verification unavailable.");
        cache.set(key, await resolveStop(stop, city));
      } catch {
        serviceUnavailable = true;
        cache.set(key, { ...stop, coordinates: null, status: "unavailable", reason: "Verification unavailable. Retry when map services are available." });
      }
    }
    return { ...cache.get(key), order: stop.order };
  }
  for (const location of result.locations) {
    for (const day of location.itinerary) {
      const stops = [];
      for (const stop of day.stops) stops.push(await resolve(stop, location.city));
      const failed = stops.map((stop, index) => stop.status === "unresolved" ? index : -1).filter((index) => index >= 0);
      if (replace && failed.length && !serviceUnavailable && Date.now() < deadline) {
        try {
          const replacements = await replace(location.city, failed.map((index) => day.stops[index]), result.locations.flatMap((loc) => loc.itinerary.flatMap((entry) => entry.stops.map((stop) => stop.name))));
          for (let n = 0; n < failed.length; n++) {
            const index = failed[n], replacement = { ...replacements[n], order: index + 1 };
            const verified = await resolve(replacement, location.city);
            if (verified.status === "verified") { day.stops[index] = replacement; day.description = ""; stops[index] = { ...verified, replacedName: stops[index].name }; }
          }
        } catch { /* Failed repairs remain explicitly unresolved. */ }
      }
      day.attractions = day.stops.map((stop) => stop.name);
      days.push({ day: day.day, city: location.city, stops });
    }
  }
  return { ...result, mapData: days };
}
export async function getDirections(coordinates, profile) {
  const waypoint = ([longitude, latitude]) => ({ location: { latLng: { latitude, longitude } } });
  const data = await googleFetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    origin: waypoint(coordinates[0]), destination: waypoint(coordinates.at(-1)),
    intermediates: coordinates.slice(1, -1).map(waypoint),
    travelMode: { walking: "WALK", cycling: "BICYCLE", driving: "DRIVE" }[profile],
    polylineQuality: "OVERVIEW", polylineEncoding: "GEO_JSON_LINESTRING", languageCode: "en-US", units: "METRIC",
  }, "routes.distanceMeters,routes.duration,routes.polyline.geoJsonLinestring,routes.warnings");
  const route = data.routes?.[0];
  const duration = Number.parseFloat(route?.duration);
  if (!route?.polyline?.geoJsonLinestring || !Number.isFinite(route.distanceMeters) || !Number.isFinite(duration)) throw new ApiError(422, "No route is available for these stops and transport mode.");
  return { geometry: route.polyline.geoJsonLinestring, distance: route.distanceMeters, duration, warnings: route.warnings || [] };
}
