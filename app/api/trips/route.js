import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import Trip from "@/models/trip";

function validItinerary(itinerary) {
  return (
    itinerary &&
    typeof itinerary === "object" &&
    !Array.isArray(itinerary) &&
    Array.isArray(itinerary.locations)
  );
}

function tripName(value, fallback) {
  const name = typeof value === "string"
    ? value.trim()
    : typeof fallback === "string"
      ? fallback.trim().slice(0, 100)
      : null;
  return name && name.length <= 100 ? name : null;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const trips = await Trip.find({ owner: user._id })
      .select("name itinerary.title itinerary.dates itinerary.locations.city createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ trips });
  } catch (error) {
    console.error("List trips error:", error);
    return NextResponse.json({ error: "Unable to load trips." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    if (!validItinerary(body?.itinerary)) {
      return NextResponse.json({ error: "A valid itinerary is required." }, { status: 400 });
    }

    const name = tripName(body.name, body.itinerary.title || "Untitled trip");
    if (!name) {
      return NextResponse.json(
        { error: "Trip name must be between 1 and 100 characters." },
        { status: 400 }
      );
    }

    const trip = await Trip.create({ owner: user._id, name, itinerary: body.itinerary });
    return NextResponse.json({ trip }, { status: 201 });
  } catch (error) {
    console.error("Save trip error:", error);
    return NextResponse.json({ error: "Unable to save trip." }, { status: 500 });
  }
}
