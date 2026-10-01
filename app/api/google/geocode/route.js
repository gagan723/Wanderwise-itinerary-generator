import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const MAX_STOPS = 60;

function getApiKey() {
  return process.env.GOOGLE_MAPS_SERVER_API_KEY;
}

async function geocodeStop(stop, city, apiKey) {
  const address = [stop.name, stop.address, city].filter(Boolean).join(", ");
  const params = new URLSearchParams({ address, key: apiKey, language: "en" });
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
    { cache: "no-store" }
  );
  const data = await response.json();

  if (!response.ok || !["OK", "ZERO_RESULTS"].includes(data.status)) {
    throw new Error(data.error_message || `Google Geocoding returned ${data.status}`);
  }

  const result = data.results?.[0];
  const location = result?.geometry?.location;

  return {
    ...stop,
    coordinates:
      Number.isFinite(location?.lng) && Number.isFinite(location?.lat)
        ? [location.lng, location.lat]
        : null,
    resolvedAddress: result?.formatted_address || stop.address || null,
    placeId: result?.place_id || null,
  };
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return Response.json(
      { error: "Google Maps is not configured on the server." },
      { status: 503 }
    );
  }

  try {
    const { locations } = await request.json();
    if (!Array.isArray(locations)) {
      return Response.json({ error: "locations must be an array." }, { status: 400 });
    }

    let stopCount = 0;
    let mappedStopCount = 0;
    const days = [];

    for (const location of locations) {
      for (const day of location.itinerary || []) {
        const rawStops =
          day.stops?.length > 0
            ? day.stops
            : (day.attractions || []).map((name, index) => ({
                name,
                order: index + 1,
              }));
        const allowedStops = rawStops.slice(
          0,
          Math.max(0, MAX_STOPS - stopCount)
        );
        stopCount += allowedStops.length;

        const stops = await Promise.all(
          allowedStops.map((stop) =>
            geocodeStop(stop, location.city, apiKey).catch(() => ({
              ...stop,
              coordinates: null,
              resolvedAddress: stop.address || null,
              placeId: null,
            }))
          )
        );
        mappedStopCount += stops.filter((stop) => stop.coordinates).length;

        days.push({
          day: day.day,
          city: location.city,
          transportMode: day.transportMode || "walking",
          stops,
        });
      }
    }

    if (stopCount > 0 && mappedStopCount === 0) {
      return Response.json(
        { error: "Google could not locate any itinerary stops." },
        { status: 502 }
      );
    }

    return Response.json({ days });
  } catch (error) {
    console.error("Google geocoding error:", error);
    return Response.json(
      { error: "Unable to locate itinerary stops." },
      { status: 502 }
    );
  }
}
