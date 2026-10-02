import { describe, expect, it } from "vitest";
import { persistableItinerary, preferencesSchema, directionsSchema, itinerarySchema } from "@/lib/schemas";
import { validateSchedule, requestedDates, editStop, updateDay } from "@/lib/itinerary";
import { preferences, tripFixture, mappedFixture } from "./fixtures";

describe("trip validation and persistence", () => {
  it("rejects impossible, reversed, and overlong date ranges", () => {
    for (const values of [{ startDate: "2026-02-30" }, { endDate: "2026-10-31" }, { endDate: "2026-12-01" }]) expect(preferencesSchema.safeParse({ ...preferences, ...values }).success).toBe(false);
    expect(requestedDates(preferences)).toEqual(["2026-11-01", "2026-11-02"]);
  });
  it("strips all temporary provider fields on every persistence level", () => {
    const value = tripFixture(); value.mapData = mappedFixture(); value.routes = { coordinates: [1, 2] };
    Object.assign(value.locations[0].itinerary[0].stops[0], { coordinates: [1, 2], resolvedAddress: "PROVIDER ADDRESS", placeId: "SECRET", status: "verified", attributions: ["DATA"] });
    const stored = persistableItinerary(value);
    expect(stored.mapData).toBeUndefined(); expect(stored.routes).toBeUndefined();
    expect(stored.locations[0].itinerary[0].stops[0]).not.toHaveProperty("coordinates");
    expect(JSON.stringify(stored)).not.toContain("PROVIDER ADDRESS"); expect(JSON.stringify(stored)).not.toContain("SECRET");
  });
  it("supports old attraction-only saved plans but rejects duplicate days", () => {
    const value = tripFixture(); delete value.locations[0].itinerary[0].stops; value.locations[0].itinerary[0].attractions = ["Louvre Museum"];
    expect(persistableItinerary(value).locations[0].itinerary[0].stops[0].name).toBe("Louvre Museum");
    value.locations[0].itinerary[1].day = 1; expect(itinerarySchema.safeParse(value).success).toBe(false);
  });
  it("rejects malformed and out-of-range coordinates and unsupported modes", () => {
    expect(directionsSchema.safeParse({ coordinates: [[181, 0], [1, 2]], profile: "walking" }).success).toBe(false);
    expect(directionsSchema.safeParse({ coordinates: [[1, 2], [1, 2]], profile: "flying" }).success).toBe(false);
  });
});
describe("schedule checks and controlled editing", () => {
  it("handles the empty planner before generation", () => { expect(validateSchedule(null)).toEqual([]); });
  it("finds missing dates, duplicates, excessive travel, and unresolved stops", () => {
    const trip = tripFixture(); trip.locations[0].itinerary[1].date = "2026-11-03";
    trip.locations[0].itinerary[1].stops[0].name = "Louvre Museum";
    const mapped = mappedFixture(trip); mapped[0].stops[0].status = "unresolved"; mapped[0].stops[0].coordinates = null;
    const codes = validateSchedule(trip, mapped, { 1: { duration: 14400 } }).map((issue) => issue.code);
    expect(codes).toEqual(expect.arrayContaining(["date", "duplicate", "unresolved", "travel"]));
  });
  it("flags overloaded visits and geographic backtracking", () => {
    const trip = tripFixture(); trip.preferences.pace = "relaxed";
    trip.locations[0].itinerary[0].stops = Array.from({ length: 5 }, (_, i) => ({ name: `Stop ${i}`, order: i + 1, estimatedVisitMinutes: 150 }));
    const mapped = mappedFixture(trip); mapped[0].stops.forEach((stop, i) => { stop.coordinates = [[0, 0], [2, 0], [0.1, 0], [1.9, 0], [0.2, 0]][i]; });
    expect(validateSchedule(trip, mapped).map((issue) => issue.code)).toEqual(expect.arrayContaining(["stops", "long", "order"]));
  });
  it("reorders and removes only the target day without mutating the original", () => {
    const original = tripFixture();
    const reordered = updateDay(original, 1, (day) => editStop(day, 0, "down"));
    expect(reordered.locations[0].itinerary[0].stops[0].name).toBe("Tuileries Garden");
    expect(original.locations[0].itinerary[0].stops[0].name).toBe("Louvre Museum");
    const removed = updateDay(reordered, 1, (day) => editStop(day, 0, "remove"));
    expect(removed.locations[0].itinerary[0].stops.map((stop) => stop.order)).toEqual([1, 2]);
    expect(removed.locations[0].itinerary[1]).toEqual(original.locations[0].itinerary[1]);
  });
});
