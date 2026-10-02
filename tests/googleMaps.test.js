import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/rateLimit", () => ({ rateLimit: vi.fn() }));
import { getDirections, matchesPlace, resolveStop, verifyItinerary } from "@/lib/googleMaps";
import { tripFixture } from "./fixtures";

function place(name = "Louvre Museum", address = "Paris, France") {
  return { id: "place-id", displayName: { text: name }, formattedAddress: address, location: { longitude: 2.3, latitude: 48.85 }, businessStatus: "OPERATIONAL" };
}
function respond(data) { return { ok: true, json: async () => data }; }
beforeEach(() => { vi.stubEnv("GOOGLE_MAPS_SERVER_API_KEY", "test-key"); vi.stubGlobal("fetch", vi.fn()); });
describe("Google Places verification", () => {
  it("requires a confident name and city match and rejects permanently closed places", () => {
    const stop = { name: "Louvre Museum" };
    expect(matchesPlace(stop, "Paris, France", place())).toBe(true);
    expect(matchesPlace(stop, "Paris, France", place("Louvre Museum", "Las Vegas, USA"))).toBe(false);
    expect(matchesPlace(stop, "Paris, France", place("Random cafe"))).toBe(false);
    expect(matchesPlace(stop, "Paris, France", { ...place(), businessStatus: "CLOSED_PERMANENTLY" })).toBe(false);
  });
  it("sends a bounded Text Search request with a field mask and no-store", async () => {
    fetch.mockResolvedValue(respond({ places: [place()] }));
    const stop = tripFixture().locations[0].itinerary[0].stops[0];
    const result = await resolveStop(stop, "Paris, France");
    expect(result.status).toBe("verified"); expect(result.coordinates).toEqual([2.3, 48.85]);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchText");
    expect(options.cache).toBe("no-store"); expect(options.headers["X-Goog-FieldMask"]).toContain("places.location");
    expect(JSON.parse(options.body).textQuery).toContain("Louvre Museum");
  });
  it("verifies replacements and discloses which suggestion was replaced", async () => {
    const itinerary = tripFixture(); itinerary.locations[0].itinerary = [itinerary.locations[0].itinerary[0]];
    itinerary.locations[0].itinerary[0].stops = [{ name: "Invented Museum", address: "Paris", order: 1 }];
    fetch.mockResolvedValueOnce(respond({ places: [] })).mockResolvedValueOnce(respond({ places: [place()] }));
    const replace = vi.fn().mockResolvedValue([{ name: "Louvre Museum", address: "Paris", order: 1 }]);
    const checked = await verifyItinerary(itinerary, replace);
    expect(replace).toHaveBeenCalledOnce();
    expect(checked.locations[0].itinerary[0].stops[0].name).toBe("Louvre Museum");
    expect(checked.mapData[0].stops[0]).toMatchObject({ status: "verified", replacedName: "Invented Museum" });
  });
  it("never labels a service outage as an invented place or loops on replacement", async () => {
    fetch.mockRejectedValue(new Error("offline")); const replace = vi.fn();
    const checked = await verifyItinerary(tripFixture(), replace);
    expect(fetch).toHaveBeenCalledOnce(); expect(replace).not.toHaveBeenCalled();
    expect(checked.mapData.flatMap((day) => day.stops).every((stop) => stop.status === "unavailable" && stop.coordinates === null)).toBe(true);
  });
  it("keeps a suggestion unresolved when the replacement cannot be matched", async () => {
    const itinerary = tripFixture(); itinerary.locations[0].itinerary = [itinerary.locations[0].itinerary[0]];
    itinerary.locations[0].itinerary[0].stops = [{ name: "Unknown", address: "Paris", order: 1 }];
    fetch.mockResolvedValue(respond({ places: [] }));
    const result = await verifyItinerary(itinerary, async () => [{ name: "Also Unknown", address: "Paris", order: 1 }]);
    expect(result.mapData[0].stops[0].status).toBe("unresolved");
    expect(result.locations[0].itinerary[0].stops[0].name).toBe("Unknown");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
describe("Google Routes", () => {
  it.each([["walking", "WALK"], ["cycling", "BICYCLE"], ["driving", "DRIVE"]])("uses %s and returns distances, durations, geometry and warnings", async (profile, mode) => {
    const geometry = { type: "LineString", coordinates: [[2, 48], [3, 48], [4, 48]] };
    fetch.mockResolvedValue(respond({ routes: [{ distanceMeters: 1000, duration: "600s", polyline: { geoJsonLinestring: geometry }, warnings: ["Use caution"] }] }));
    expect(await getDirections(geometry.coordinates, profile)).toEqual({ distance: 1000, duration: 600, geometry, warnings: ["Use caution"] });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.travelMode).toBe(mode); expect(body.intermediates).toHaveLength(1);
  });
  it("reports an unavailable route instead of drawing a straight-line substitute", async () => {
    fetch.mockResolvedValue(respond({ routes: [] }));
    await expect(getDirections([[1, 2], [3, 4]], "walking")).rejects.toMatchObject({ status: 422 });
  });
});
