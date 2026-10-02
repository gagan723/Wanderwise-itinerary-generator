import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/currentUser", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/rateLimit", () => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/gemini", () => ({ askGemini: vi.fn(), regenerateDay: vi.fn(), replacementStops: vi.fn() }));
vi.mock("@/lib/googleMaps", () => ({ verifyItinerary: vi.fn(async (value) => ({ ...value, mapData: [] })) }));
import { getCurrentUser } from "@/lib/currentUser";
import { askGemini, regenerateDay } from "@/lib/gemini";
import { POST } from "@/app/api/gemini/route";
import { preferences, tripFixture } from "./fixtures";
const request = (body) => new Request("http://localhost/api/gemini", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { getCurrentUser.mockResolvedValue({ _id: "owner" }); askGemini.mockReset(); regenerateDay.mockReset(); });
it("requires authentication and all preferences before generating", async () => {
  getCurrentUser.mockResolvedValue(null);
  expect((await POST(request({ type: "info", userMessage: "Paris" }))).status).toBe(401);
  getCurrentUser.mockResolvedValue({ _id: "owner" });
  expect((await POST(request({ type: "itinerary", userMessage: "Go", context: { destination: "Paris" } }))).status).toBe(400);
  expect(askGemini).not.toHaveBeenCalled();
});
it("retries incomplete date coverage once and rejects consistently invalid plans", async () => {
  const bad = tripFixture(); bad.locations[0].itinerary.pop();
  askGemini.mockResolvedValue(bad);
  const response = await POST(request({ type: "itinerary", userMessage: "Go", context: preferences }));
  expect(response.status).toBe(502); expect(askGemini).toHaveBeenCalledTimes(2);
});
it("returns a validated trip with confirmed preferences", async () => {
  askGemini.mockResolvedValue(tripFixture());
  const response = await POST(request({ type: "itinerary", userMessage: "Go", context: preferences }));
  expect(response.status).toBe(200); expect((await response.json()).preferences).toEqual(preferences);
});
it("regenerates only the selected day", async () => {
  const itinerary = tripFixture();
  regenerateDay.mockResolvedValue({ ...itinerary.locations[0].itinerary[1], title: "A fresh day" });
  const response = await POST(request({ type: "day", itinerary, day: 2 }));
  const result = await response.json(); expect(response.status).toBe(200);
  expect(result.locations[0].itinerary[0].title).toBe(itinerary.locations[0].itinerary[0].title);
  expect(result.locations[0].itinerary[1].title).toBe("A fresh day");
  expect((await POST(request({ type: "day", itinerary, day: 9 }))).status).toBe(400);
});
