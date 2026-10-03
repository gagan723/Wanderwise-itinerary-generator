import { beforeEach, expect, it, vi } from "vitest";
const model = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock("@google/generative-ai", () => ({ GoogleGenerativeAI: class { getGenerativeModel() { return model; } } }));
import { askGemini, selectVerifiedItinerary } from "@/lib/gemini";
import { preferences, tripFixture } from "./fixtures";

const response = (body) => ({ response: { text: () => JSON.stringify(body) } });
const reply = (body) => model.generateContent.mockResolvedValue(response(body));
function outlineFixture() {
  const trip = tripFixture(); delete trip.preferences;
  trip.locations.forEach((location) => location.itinerary.forEach((day) => { delete day.stops; delete day.attractions; }));
  return trip;
}
function candidates() {
  return new Map([["Paris, France", [
    { placeId: "place-louvre", displayName: "Louvre Museum", formattedAddress: "Paris", coordinates: [2.3, 48.85], attributions: [] },
    { placeId: "place-eiffel", displayName: "Eiffel Tower", formattedAddress: "Paris", coordinates: [2.29, 48.86], attributions: [] },
  ]]]);
}
const stop = (placeId, name) => ({ placeId, name, address: "Paris", estimatedVisitMinutes: 60, notes: "Plan ahead" });

beforeEach(() => { vi.stubEnv("GEMINI_API_KEY", "test"); model.generateContent.mockReset(); });

it("validates AI JSON locally instead of trusting its advertised response schema", async () => {
  reply({ title: 999, locations: "bad" });
  await expect(askGemini({ type: "itinerary", context: preferences })).rejects.toMatchObject({ status: 502 });
});

it("determines readiness from required preferences, not model wording", async () => {
  reply({ status_message: "Ready to generate itinerary!", collected_details: { destination: "Paris" } });
  const result = await askGemini({ userMessage: "Paris" });
  expect(result.missing_fields).toContain("pace"); expect(result.missing_fields).toContain("budget");
  expect(result.status_message).not.toBe("Ready to generate itinerary!");
});

it("merges known preferences and removes nullable optional fields", async () => {
  reply({ status_message: "Thanks", collected_details: { pace: "relaxed", specificRequests: null } });
  const result = await askGemini({ userMessage: "Relaxed please", context: preferences });
  expect(result.collected_details).toEqual({ ...preferences, pace: "relaxed" }); expect(result.missing_fields).toEqual([]);
});

it("asks for a valid range before allowing generation", async () => {
  reply({ status_message: "Ready", collected_details: { ...preferences, endDate: "2026-10-01" } });
  expect((await askGemini({ userMessage: "Dates" })).missing_fields).toEqual(["startDate", "endDate"]);
});

it("accepts only supplied Place IDs and assembles persistent stops", async () => {
  reply({ days: [{ day: 1, stops: [stop("place-louvre", "Louvre Museum")] }, { day: 2, stops: [stop("place-eiffel", "Eiffel Tower")] }] });
  const result = await selectVerifiedItinerary(outlineFixture(), candidates(), preferences);
  expect(result.locations[0].itinerary[0].stops[0]).toMatchObject({ placeId: "place-louvre", order: 1 });
});

it("retries once when Gemini invents a Place ID", async () => {
  model.generateContent
    .mockResolvedValueOnce(response({ days: [{ day: 1, stops: [stop("invented", "Invented")] }, { day: 2, stops: [] }] }))
    .mockResolvedValueOnce(response({ days: [{ day: 1, stops: [stop("place-louvre", "Louvre Museum")] }, { day: 2, stops: [stop("place-eiffel", "Eiffel Tower")] }] }));
  const result = await selectVerifiedItinerary(outlineFixture(), candidates(), preferences);
  expect(result.locations[0].itinerary[1].stops[0].placeId).toBe("place-eiffel");
  expect(model.generateContent).toHaveBeenCalledTimes(2);
});

it("fails after two invalid selections", async () => {
  reply({ days: [{ day: 1, stops: [stop("place-louvre", "Louvre Museum")] }, { day: 2, stops: [stop("place-louvre", "Louvre Museum")] }] });
  await expect(selectVerifiedItinerary(outlineFixture(), candidates(), preferences)).rejects.toMatchObject({ status: 502 });
  expect(model.generateContent).toHaveBeenCalledTimes(2);
});
