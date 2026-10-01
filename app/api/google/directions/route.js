import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const TRAVEL_MODES = {
  walking: "WALK",
  cycling: "BICYCLE",
  driving: "DRIVE",
};

function decodePolyline(encoded) {
  const path = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    longitude += result & 1 ? ~(result >> 1) : result >> 1;

    path.push({ lat: latitude / 1e5, lng: longitude / 1e5 });
  }

  return path;
}

function toWaypoint([longitude, latitude]) {
  return { location: { latLng: { latitude, longitude } } };
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Google Maps is not configured on the server." },
      { status: 503 }
    );
  }

  try {
    const { coordinates, profile = "walking" } = await request.json();
    const validCoordinates = Array.isArray(coordinates)
      ? coordinates.filter(
          (coordinate) =>
            Array.isArray(coordinate) &&
            coordinate.length === 2 &&
            coordinate.every(Number.isFinite)
        )
      : [];

    if (validCoordinates.length < 2 || validCoordinates.length > 27) {
      return Response.json(
        { error: "Directions require between 2 and 27 valid coordinates." },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify({
          origin: toWaypoint(validCoordinates[0]),
          destination: toWaypoint(validCoordinates.at(-1)),
          intermediates: validCoordinates.slice(1, -1).map(toWaypoint),
          travelMode: TRAVEL_MODES[profile] || "WALK",
          polylineQuality: "OVERVIEW",
          polylineEncoding: "ENCODED_POLYLINE",
          computeAlternativeRoutes: false,
          languageCode: "en-US",
          units: "METRIC",
        }),
        cache: "no-store",
      }
    );
    const data = await response.json();
    const route = data.routes?.[0];

    if (!response.ok || !route?.polyline?.encodedPolyline) {
      return Response.json(
        { error: data.error?.message || "No route was found for these stops." },
        { status: 422 }
      );
    }

    return Response.json({
      path: decodePolyline(route.polyline.encodedPolyline),
      distance: route.distanceMeters,
      duration: Number.parseFloat(route.duration),
    });
  } catch (error) {
    console.error("Google directions error:", error);
    return Response.json(
      { error: "Unable to calculate the route." },
      { status: 502 }
    );
  }
}
