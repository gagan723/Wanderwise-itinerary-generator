import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ user: null, rows: [], limited: false }));
vi.mock("@/lib/currentUser", () => ({ getCurrentUser: vi.fn(async () => state.user) }));
vi.mock("@/lib/mongodb", () => ({ default: vi.fn() }));
vi.mock("@/lib/rateLimit", () => ({ rateLimit: vi.fn(async () => { if (state.limited) { const error = new Error("Too many requests."); error.status = 429; error.retryAfter = 30; throw error; } }) }));
vi.mock("@/models/trip", () => {
  const matches = (row, query) => Object.entries(query).every(([key, value]) => row[key] === value);
  const chain = (result) => ({ select() { return this; }, sort() { return this; }, limit() { return this; }, lean: async () => structuredClone(result) });
  return { default: {
    find: vi.fn((query) => chain(state.rows.filter((row) => matches(row, query)))),
    findOne: vi.fn((query) => chain(state.rows.find((row) => matches(row, query)) || null)),
    create: vi.fn(async (row) => { const created = { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", ...row }; state.rows.push(created); return structuredClone(created); }),
    findOneAndUpdate: vi.fn((query, update) => { const row = state.rows.find((entry) => matches(entry, query)); if (row) { Object.assign(row, update.$set); Object.keys(update.$unset || {}).forEach((key) => delete row[key]); } return chain(row || null); }),
    findOneAndDelete: vi.fn((query) => { const index = state.rows.findIndex((row) => matches(row, query)); return chain(index < 0 ? null : state.rows.splice(index, 1)[0]); }),
  } };
});
import { POST as saveTrip, GET as listTrips } from "@/app/api/trips/route";
import { GET as getTrip, PATCH as updateTrip, DELETE as deleteTrip } from "@/app/api/trips/[id]/route";
import { GET as getShared } from "@/app/api/shared/[token]/route";
import { hashToken } from "@/lib/tripAccess";
import { tripFixture, mappedFixture } from "./fixtures";

const id = "aaaaaaaaaaaaaaaaaaaaaaaa";
const params = { params: Promise.resolve({ id }) };
const request = (body, method = "POST") => new Request("http://localhost/api/trips", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => { state.user = { _id: "owner-a" }; state.rows = []; state.limited = false; });
describe("owner-scoped trip API integration", () => {
  it("requires authentication for list, save, get, update and delete", async () => {
    state.user = null;
    for (const response of [await listTrips(), await saveTrip(request({ itinerary: tripFixture() })), await getTrip(null, params), await updateTrip(request({ name: "Changed" }), params), await deleteTrip(null, params)]) expect(response.status).toBe(401);
  });
  it("saves, lists, updates and deletes while stripping temporary content", async () => {
    const itinerary = tripFixture(); itinerary.mapData = mappedFixture();
    const created = await saveTrip(request({ itinerary, owner: "attacker" })); expect(created.status).toBe(201);
    expect(state.rows[0].owner).toBe("owner-a"); expect(state.rows[0].itinerary.mapData).toBeUndefined();
    expect((await (await listTrips()).json()).trips).toHaveLength(1);
    expect((await (await getTrip(null, params)).json()).trip.sharingEnabled).toBe(false);
    expect((await updateTrip(request({ name: "My Paris trip" }), params)).status).toBe(200);
    const edited = tripFixture(); edited.locations[0].itinerary[1].transportMode = "driving";
    expect((await updateTrip(request({ itinerary: edited }), params)).status).toBe(200);
    expect(state.rows[0].itinerary.locations[0].itinerary[1].transportMode).toBe("driving");
    expect((await deleteTrip(null, params)).status).toBe(200); expect(state.rows).toHaveLength(0);
  });
  it("does not reveal or mutate another user's trip", async () => {
    await saveTrip(request({ itinerary: tripFixture() })); state.user = { _id: "owner-b" };
    expect((await (await listTrips()).json()).trips).toEqual([]);
    expect((await getTrip(null, params)).status).toBe(404);
    expect((await updateTrip(request({ name: "Stolen", sharing: true }), params)).status).toBe(404);
    expect((await deleteTrip(null, params)).status).toBe(404); expect(state.rows).toHaveLength(1);
  });
  it("rejects invalid payloads, malformed IDs, and rate-limited writes", async () => {
    expect((await saveTrip(request({ itinerary: { locations: [] } }))).status).toBe(400);
    expect((await saveTrip(new Request("http://localhost", { method: "POST", body: "{" }))).status).toBe(400);
    expect((await updateTrip(request({ owner: "other" }), params)).status).toBe(400);
    expect((await getTrip(null, { params: Promise.resolve({ id: "invalid" }) })).status).toBe(404);
    state.limited = true; const response = await saveTrip(request({ itinerary: tripFixture() }));
    expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("30");
    expect(response.headers.get("X-Request-Id")).toBeTruthy(); expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
});
describe("revocable read-only sharing", () => {
  it("stores only a token hash, excludes owner information, rotates and revokes links", async () => {
    await saveTrip(request({ itinerary: tripFixture() }));
    const enabled = await (await updateTrip(request({ sharing: true }), params)).json();
    expect(enabled.shareToken).toMatch(/^[a-f0-9]{64}$/);
    expect(state.rows[0].shareTokenHash).toBe(hashToken(enabled.shareToken));
    expect(enabled.trip.shareTokenHash).toBeUndefined();
    state.user = null;
    const sharedParams = { params: Promise.resolve({ token: enabled.shareToken }) };
    const publicResponse = await getShared(null, sharedParams);
    expect(publicResponse.status).toBe(200);
    expect(Object.keys((await publicResponse.json()).trip).sort()).toEqual(["itinerary", "name"]);
    expect((await updateTrip(request({ name: "Hacked" }), params)).status).toBe(401);
    state.user = { _id: "owner-a" };
    const replacement = await (await updateTrip(request({ sharing: true }), params)).json();
    expect(replacement.shareToken).not.toBe(enabled.shareToken);
    expect((await getShared(null, sharedParams)).status).toBe(404);
    await updateTrip(request({ sharing: false }), params);
    expect((await getShared(null, { params: Promise.resolve({ token: replacement.shareToken }) })).status).toBe(404);
  });
});
