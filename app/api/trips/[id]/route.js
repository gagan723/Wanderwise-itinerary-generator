import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import Trip from "@/models/trip";

async function ownedTripQuery(id) {
  const user = await getCurrentUser();
  if (!user) return { unauthorized: true };
  if (!mongoose.isValidObjectId(id)) return { user, invalid: true };
  return { user, query: { _id: id, owner: user._id } };
}

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const access = await ownedTripQuery(id);
    if (access.unauthorized) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (access.invalid) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    const trip = await Trip.findOne(access.query).lean();
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    return NextResponse.json({ trip });
  } catch (error) {
    console.error("Get trip error:", error);
    return NextResponse.json({ error: "Unable to load trip." }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const access = await ownedTripQuery(id);
    if (access.unauthorized) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (access.invalid) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 100) {
      return NextResponse.json(
        { error: "Trip name must be between 1 and 100 characters." },
        { status: 400 }
      );
    }

    const trip = await Trip.findOneAndUpdate(
      access.query,
      { $set: { name } },
      { new: true, runValidators: true }
    ).lean();
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    return NextResponse.json({ trip });
  } catch (error) {
    console.error("Rename trip error:", error);
    return NextResponse.json({ error: "Unable to rename trip." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const access = await ownedTripQuery(id);
    if (access.unauthorized) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (access.invalid) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    const trip = await Trip.findOneAndDelete(access.query).lean();
    if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    return NextResponse.json({ message: "Trip deleted." });
  } catch (error) {
    console.error("Delete trip error:", error);
    return NextResponse.json({ error: "Unable to delete trip." }, { status: 500 });
  }
}
