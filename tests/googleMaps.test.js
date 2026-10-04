import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/rateLimit", () => ({ rateLimit: vi.fn() }));
import { discoverPlaces, getDirections, hydrateVerifiedItinerary, matchesPlace, resolveStop, verifyItinerary } from "@/lib/googleMaps";
import { tripFixture } from "./fixtures";

function place(name = "Louvre Museum", address = "Paris, France", id = "place-id") {
  return { id, displayName: { text: name }, formattedAddress: address, location: { longitude: 2.3, latitude: 48.85 }, businessStatus: "OPERATIONAL", types: ["museum"] };
}
function respond(data, status = 200) { return { ok: status >= 200 && status < 300, status, json: async () => data }; }
beforeEach(() => { vi.stubEnv("GOOGLE_MAPS_SERVER_API_KEY", "test-key"); vi.stubGlobal("fetch", vi.fn()); });

describe("Google Places discovery", () => {
  it("uses one bounded search when the first pool meets the pace target", async () => {
    fetch.mockResolvedValue(respond({ places: Array.from({ length: 6 }, (_, index) => place(`Place ${index}`, "Paris, France", `id-${index}`)) }));
    const result = await discoverPlaces("Paris, France", "art and food", "balanced", 2);
    expect(result).toHaveLength(6); expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = fetch.mock.calls[0], body = JSON.parse(options.body);
    expect(url).toContain("places:searchText"); expect(body).toMatchObject({ pageSize: 20, languageCode: "en" });
    expect(body.textQuery).toContain("art and food"); expect(options.headers["X-Goog-FieldMask"]).toContain("places.location");
  });

  it("uses exactly one fallback and filters duplicates, closed places, regions and missing coordinates", async () => {
    const duplicate = place("Louvre", "Paris", "kept");
    fetch.mockResolvedValueOnce(respond({ places: [duplicate] })).mockResolvedValueOnce(respond({ places: [
      duplicate,
      place("Garden", "Paris", "garden"),
      { ...place("Closed", "Paris", "closed"), businessStatus: "CLOSED_PERMANENTLY" },
      { ...place("Paris", "France", "region"), types: ["locality"] },
      { ...place("Nowhere", "Paris", "missing"), location: null },
    ] }));
    const result = await discoverPlaces("Paris, France", "art", "busy", 1);
    expect(result.map((entry) => entry.placeId)).toEqual(["kept", "garden"]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("fails clearly after two empty searches", async () => {
    fetch.mockResolvedValue(respond({ places: [] }));
    await expect(discoverPlaces("Unknown", "nature", "relaxed", 1)).rejects.toMatchObject({ status: 422 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe("Google Places verification", () => {
  it("requires a confident name and city match for legacy stops", () => {
    const stop = { name: "Louvre Museum" };
    expect(matchesPlace(stop, "Paris, France", place())).toBe(true);
    expect(matchesPlace(stop, "Paris, France", place("Louvre Museum", "Las Vegas, USA"))).toBe(false);
    expect(matchesPlace(stop, "Paris, France", place("Random cafe"))).toBe(false);
    expect(matchesPlace(stop, "Paris, France", { ...place(), businessStatus: "CLOSED_PERMANENTLY" })).toBe(false);
  });

  it("uses Text Search only for a legacy stop", async () => {
    fetch.mockResolvedValue(respond({ places: [place()] }));
    const stop = { ...tripFixture().locations[0].itinerary[0].stops[0] }; delete stop.placeId;
    const result = await resolveStop(stop, "Paris, France");
    expect(result.status).toBe("verified"); expect(result.coordinates).toEqual([2.3, 48.85]);
    expect(fetch.mock.calls[0][0]).toContain("places:searchText");
  });

  it("refreshes a saved Place ID with exact Place Details", async () => {
    fetch.mockResolvedValue(respond(place()));
    const result = await resolveStop({ name: "Saved name", address: "", placeId: "place-id", order: 1 }, "Paris, France");
    expect(result).toMatchObject({ status: "verified", placeId: "place-id", resolvedAddress: "Paris, France" });
    expect(fetch.mock.calls[0][0]).toBe("https://places.googleapis.com/v1/places/place-id");
    expect(fetch.mock.calls[0][1].method).toBe("GET");
  });

  it("keeps a stale Place ID unresolved without a replacement search", async () => {
    fetch.mockResolvedValue(respond({}, 404));
    const result = await resolveStop({ name: "Old place", address: "", placeId: "stale", order: 1 }, "Paris, France");
    expect(result.status).toBe("unresolved"); expect(fetch).toHaveBeenCalledOnce();
  });

  it("hydrates newly generated stops without another provider call", () => {
    const itinerary = tripFixture(), candidate = { placeId: "place-louvre", formattedAddress: "Google address", coordinates: [2.3, 48.85], attributions: [] };
    const candidates = new Map([["Paris, France", [candidate]]]);
    const oneDay = { ...itinerary, locations: [{ ...itinerary.locations[0], itinerary: [{ ...itinerary.locations[0].itinerary[0], stops: [itinerary.locations[0].itinerary[0].stops[0]] }] }] };
    const result = hydrateVerifiedItinerary(oneDay, candidates);
    expect(result.mapData[0].stops[0]).toMatchObject({ status: "verified", resolvedAddress: "Google address" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("never labels a provider outage as an absent place", async () => {
    fetch.mockRejectedValue(new Error("offline"));
    const checked = await verifyItinerary(tripFixture());
    expect(fetch).toHaveBeenCalledOnce();
    expect(checked.mapData.flatMap((day) => day.stops).every((stop) => stop.status === "unavailable" && stop.coordinates === null)).toBe(true);
  });
});

describe("Google Routes", () => {
  it.each([["walking", "WALK"], ["cycling", "BICYCLE"], ["driving", "DRIVE"]])("uses %s and returns distances, durations, geometry and warnings", async (profile, mode) => {
    const geometry = { type: "LineString", coordinates: [[2, 48], [3, 48], [4, 48]] };
    fetch.mockResolvedValue(respond({ routes: [{ distanceMeters: 1000, duration: "600s", polyline: { geoJsonLinestring: geometry }, warnings: ["Use caution"] }] }));
    expect(await getDirections(geometry.coordinates, profile)).toEqual({ distance: 1000, duration: 600, geometry, warnings: ["Use caution"] });
    expect(JSON.parse(fetch.mock.calls[0][1].body).travelMode).toBe(mode);
  });

  it("reports an unavailable route instead of drawing a straight-line substitute", async () => {
    fetch.mockResolvedValue(respond({ routes: [] }));
    await expect(getDirections([[1, 2], [3, 4]], "walking")).rejects.toMatchObject({ status: 422 });
  });
});
