import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/currentUser", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/rateLimit", () => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/tripAccess", () => ({ getSharedTrip: vi.fn(), hashToken: (value) => value }));
vi.mock("@/lib/googleMaps", () => ({ verifyItinerary: vi.fn(), getDirections: vi.fn() }));
import { getCurrentUser } from "@/lib/currentUser";
import { getSharedTrip } from "@/lib/tripAccess";
import { verifyItinerary, getDirections } from "@/lib/googleMaps";
import { POST as verify } from "@/app/api/google/verify/route";
import { POST as directions } from "@/app/api/google/directions/route";
import { tripFixture, mappedFixture, routeFixture } from "./fixtures";
const request = (body) => new Request("http://localhost/api/google", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => {
  getCurrentUser.mockResolvedValue({ _id: "owner" }); getSharedTrip.mockResolvedValue({ itinerary: tripFixture() });
  verifyItinerary.mockImplementation(async (itinerary) => ({ ...itinerary, mapData: mappedFixture(itinerary) }));
  getDirections.mockResolvedValue(routeFixture);
});
it("requires authentication for private mapping requests", async () => {
  getCurrentUser.mockResolvedValue(null);
  expect((await verify(request({ itinerary: tripFixture() }))).status).toBe(401);
  expect((await directions(request({ coordinates: [[1, 2], [2, 3]], profile: "walking" }))).status).toBe(401);
  expect(verifyItinerary).not.toHaveBeenCalled(); expect(getDirections).not.toHaveBeenCalled();
});
it("rejects invalid coordinates before making paid requests", async () => {
  expect((await directions(request({ coordinates: [[500, 2], [2, 3]], profile: "walking" }))).status).toBe(400);
  expect(getDirections).not.toHaveBeenCalled();
});
it("public mapping accepts only the saved trip, never visitor-supplied locations or modes", async () => {
  const shareToken = "a".repeat(64); getCurrentUser.mockResolvedValue(null);
  expect((await verify(request({ shareToken, itinerary: tripFixture() }))).status).toBe(400);
  expect((await directions(request({ shareToken, day: 1, coordinates: [[1, 2], [2, 3]], profile: "driving" }))).status).toBe(400);
  expect((await directions(request({ shareToken, day: 2 }))).status).toBe(200);
  expect(getDirections.mock.calls[0][1]).toBe("walking");
  expect(verifyItinerary.mock.calls[0][0].locations[0].itinerary).toHaveLength(1);
});
it("revoked tokens cannot call mapping providers", async () => {
  const error = new Error("Revoked"); error.status = 404; getSharedTrip.mockRejectedValue(error);
  expect((await directions(request({ shareToken: "a".repeat(64), day: 1 }))).status).toBe(404);
  expect(getDirections).not.toHaveBeenCalled();
});
