import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/currentUser", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/rateLimit", () => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/gemini", () => ({
  askGemini: vi.fn(), generateTripOutline: vi.fn(), regenerateDayOutline: vi.fn(), selectVerifiedItinerary: vi.fn(),
}));
vi.mock("@/lib/googleMaps", () => ({
  discoverPlaces: vi.fn(), hydrateVerifiedItinerary: vi.fn((value) => ({ ...value, mapData: [] })),
}));
import { getCurrentUser } from "@/lib/currentUser";
import { askGemini, generateTripOutline, regenerateDayOutline, selectVerifiedItinerary } from "@/lib/gemini";
import { discoverPlaces } from "@/lib/googleMaps";
import { POST } from "@/app/api/gemini/route";
import { preferences, tripFixture } from "./fixtures";

const request = (body) => new Request("http://localhost/api/gemini", { method: "POST", body: JSON.stringify(body) });
function outlineFixture() {
  const trip = tripFixture(); delete trip.preferences;
  trip.locations.forEach((location) => location.itinerary.forEach((day) => { delete day.stops; delete day.attractions; }));
  return trip;
}
function singleDayTrip(itinerary, dayNumber, title = "A fresh day") {
  const day = structuredClone(itinerary.locations[0].itinerary.find((entry) => entry.day === dayNumber)); day.title = title;
  return { title: itinerary.title, dates: itinerary.dates, locations: [{ city: "Paris, France", days: [dayNumber], itinerary: [day] }] };
}

beforeEach(() => {
  getCurrentUser.mockResolvedValue({ _id: "owner" });
  for (const mock of [askGemini, generateTripOutline, regenerateDayOutline, selectVerifiedItinerary, discoverPlaces]) mock.mockReset();
  discoverPlaces.mockResolvedValue([{ placeId: "candidate", displayName: "Candidate", formattedAddress: "Paris", coordinates: [2.3, 48.85], attributions: [] }]);
});

it("requires authentication and all preferences before generating", async () => {
  getCurrentUser.mockResolvedValue(null);
  expect((await POST(request({ type: "info", userMessage: "Paris" }))).status).toBe(401);
  getCurrentUser.mockResolvedValue({ _id: "owner" });
  expect((await POST(request({ type: "itinerary", userMessage: "Go", context: { destination: "Paris" } }))).status).toBe(400);
  expect(generateTripOutline).not.toHaveBeenCalled();
});

it("retries incomplete outline date coverage once and rejects consistently invalid plans", async () => {
  const bad = outlineFixture(); bad.locations[0].itinerary.pop();
  generateTripOutline.mockResolvedValue(bad);
  const response = await POST(request({ type: "itinerary", userMessage: "Go", context: preferences }));
  expect(response.status).toBe(502); expect(generateTripOutline).toHaveBeenCalledTimes(2); expect(discoverPlaces).not.toHaveBeenCalled();
});

it("discovers candidates once per city and returns a validated hydrated trip", async () => {
  generateTripOutline.mockResolvedValue(outlineFixture()); selectVerifiedItinerary.mockResolvedValue(tripFixture());
  const response = await POST(request({ type: "itinerary", userMessage: "Go", context: preferences }));
  const result = await response.json();
  expect(response.status).toBe(200); expect(result.preferences).toEqual(preferences);
  expect(discoverPlaces).toHaveBeenCalledOnce(); expect(selectVerifiedItinerary).toHaveBeenCalledOnce();
});

it("regenerates only the selected day and excludes IDs used on other days", async () => {
  const itinerary = tripFixture(), outlineDay = { ...outlineFixture().locations[0].itinerary[1], title: "A fresh day" };
  regenerateDayOutline.mockResolvedValue(outlineDay);
  selectVerifiedItinerary.mockResolvedValue(singleDayTrip(itinerary, 2));
  const response = await POST(request({ type: "day", itinerary, day: 2 }));
  const result = await response.json(); expect(response.status).toBe(200);
  expect(result.locations[0].itinerary[0].title).toBe(itinerary.locations[0].itinerary[0].title);
  expect(result.locations[0].itinerary[1].title).toBe("A fresh day");
  const excluded = discoverPlaces.mock.calls[0][4];
  expect(excluded).toEqual(expect.arrayContaining(["place-louvre", "place-tuileries", "place-orsay"]));
  expect(excluded).not.toContain("place-eiffel");
  expect((await POST(request({ type: "day", itinerary, day: 9 }))).status).toBe(400);
});
