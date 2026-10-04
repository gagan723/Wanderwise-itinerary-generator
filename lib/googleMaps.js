import { ApiError } from "./api";
import { coordinateSchema } from "./schemas";
import { stopKey } from "./itinerary";
import { rateLimit } from "./rateLimit";

const DETAIL_FIELDS = "id,displayName,formattedAddress,location,businessStatus,attributions,types";
const SEARCH_FIELDS = DETAIL_FIELDS.split(",").map((field) => `places.${field}`).join(",");
const ADMINISTRATIVE_TYPES = new Set(["locality", "country", "administrative_area_level_1", "administrative_area_level_2"]);
const PACE_MINIMUM = { relaxed: 2, balanced: 3, busy: 4 };

async function googleFetch(url, { body, fieldMask = DETAIL_FIELDS, method = "POST", allowNotFound = false } = {}) {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key) throw new ApiError(503, "Map verification is not configured.");
  await rateLimit("google-maps:provider:minute", 240, 60000);
  const response = await fetch(url, {
    method, body: body ? JSON.stringify(body) : undefined, cache: "no-store", signal: AbortSignal.timeout(12000),
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": fieldMask },
  });
  if (allowNotFound && [400, 404].includes(response.status)) return null;
  if (!response.ok) throw new ApiError(502, "Google Maps is temporarily unavailable.");
  return response.json();
}
const normalize = (value) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const hasCoordinates = (place) => coordinateSchema.safeParse([place.location?.longitude, place.location?.latitude]).success;
const isUsablePlace = (place) => Boolean(place?.id && place.displayName?.text && hasCoordinates(place)
  && place.businessStatus !== "CLOSED_PERMANENTLY"
  && !place.types?.some((type) => ADMINISTRATIVE_TYPES.has(type)));

function candidateFromPlace(place) {
  if (!isUsablePlace(place)) return null;
  return {
    placeId: place.id,
    displayName: place.displayName.text,
    formattedAddress: place.formattedAddress || "",
    coordinates: [place.location.longitude, place.location.latitude],
    businessStatus: place.businessStatus,
    types: place.types || [],
    attributions: place.attributions || [],
  };
}

export function matchesPlace(stop, city, place) {
  if (!isUsablePlace(place)) return false;
  const name = normalize(stop.name), candidate = normalize(place.displayName?.text || "");
  const words = new Set(name.split(" ")), candidateWords = new Set(candidate.split(" "));
  const overlap = [...words].filter((word) => candidateWords.has(word)).length;
  const nameMatches = name === candidate || overlap / new Set([...words, ...candidateWords]).size >= 0.8;
  const locality = normalize(city.split(",")[0]);
  const context = normalize([place.formattedAddress, ...(place.addressComponents || []).flatMap((part) => [part.longText, part.shortText])].filter(Boolean).join(" "));
  return nameMatches && locality.length > 0 && (` ${context} `).includes(` ${locality} `);
}

async function searchPlaces(textQuery) {
  const data = await googleFetch("https://places.googleapis.com/v1/places:searchText", {
    body: { textQuery: textQuery.slice(0, 600), pageSize: 20, languageCode: "en" },
    fieldMask: SEARCH_FIELDS,
  });
  return (data.places || []).map(candidateFromPlace).filter(Boolean);
}

export async function discoverPlaces(city, interests, pace, dayCount, excludedIds = []) {
  const excluded = new Set(excludedIds), unique = new Map();
  const add = (places) => places.forEach((place) => { if (!excluded.has(place.placeId)) unique.set(place.placeId, place); });
  const interestQuery = String(interests || "things to do").slice(0, 200);
  add(await searchPlaces(`top attractions and ${interestQuery} in ${city}`));
  const target = Math.max(1, dayCount) * (PACE_MINIMUM[pace] || PACE_MINIMUM.balanced);
  if (unique.size < target) add(await searchPlaces(`popular landmarks museums parks and cultural attractions in ${city}`));
  if (!unique.size) throw new ApiError(422, `No verified Google Maps attractions were found for ${city}. Try a more specific destination.`);
  return [...unique.values()];
}

export function hydrateVerifiedItinerary(itinerary, candidatesByCity) {
  const mapData = itinerary.locations.map((location) => {
    const candidates = candidatesByCity.get(location.city) || [];
    const byId = new Map(candidates.map((candidate) => [candidate.placeId, candidate]));
    return location.itinerary.map((day) => ({
      day: day.day,
      city: location.city,
      stops: day.stops.map((stop) => {
        const place = byId.get(stop.placeId);
        if (!place) return { ...stop, status: "unresolved", coordinates: null, reason: "This attraction was not returned by Google Maps." };
        return { ...stop, status: "verified", coordinates: place.coordinates, resolvedAddress: place.formattedAddress, placeId: place.placeId, attributions: place.attributions };
      }),
    }));
  }).flat();
  return { ...itinerary, mapData };
}

async function resolvePlaceId(stop) {
  const place = await googleFetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(stop.placeId)}`, { method: "GET", allowNotFound: true });
  const candidate = candidateFromPlace(place);
  if (!candidate) return { ...stop, status: "unresolved", coordinates: null, reason: "This saved Google Maps place is no longer available." };
  return { ...stop, status: "verified", coordinates: candidate.coordinates, resolvedAddress: candidate.formattedAddress, placeId: candidate.placeId, attributions: candidate.attributions };
}

export async function resolveStop(stop, city) {
  if (stop.placeId) return resolvePlaceId(stop);
  const data = await googleFetch("https://places.googleapis.com/v1/places:searchText", { body: {
    textQuery: `${stop.name}, ${stop.address || city}, ${city}`.slice(0, 600), pageSize: 5, languageCode: "en",
  }, fieldMask: `${SEARCH_FIELDS},places.addressComponents` });
  const place = data.places?.find((entry) => matchesPlace(stop, city, entry));
  return place ? { ...stop, status: "verified", coordinates: [place.location.longitude, place.location.latitude], resolvedAddress: place.formattedAddress || "", placeId: place.id, attributions: place.attributions || [] }
    : { ...stop, status: "unresolved", coordinates: null, reason: "No confident attraction match in this city. Check the place before visiting." };
}
export async function verifyItinerary(itinerary) {
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
      day.attractions = day.stops.map((stop) => stop.name);
      days.push({ day: day.day, city: location.city, stops });
    }
  }
  return { ...result, mapData: days };
}
export async function getDirections(coordinates, profile) {
  const waypoint = ([longitude, latitude]) => ({ location: { latLng: { latitude, longitude } } });
  const data = await googleFetch("https://routes.googleapis.com/directions/v2:computeRoutes", { body: {
    origin: waypoint(coordinates[0]), destination: waypoint(coordinates.at(-1)),
    intermediates: coordinates.slice(1, -1).map(waypoint),
    travelMode: { walking: "WALK", cycling: "BICYCLE", driving: "DRIVE" }[profile],
    polylineQuality: "OVERVIEW", polylineEncoding: "GEO_JSON_LINESTRING", languageCode: "en-US", units: "METRIC",
  }, fieldMask: "routes.distanceMeters,routes.duration,routes.polyline.geoJsonLinestring,routes.warnings" });
  const route = data.routes?.[0];
  const duration = Number.parseFloat(route?.duration);
  if (!route?.polyline?.geoJsonLinestring || !Number.isFinite(route.distanceMeters) || !Number.isFinite(duration)) throw new ApiError(422, "No route is available for these stops and transport mode.");
  return { geometry: route.polyline.geoJsonLinestring, distance: route.distanceMeters, duration, warnings: route.warnings || [] };
}
