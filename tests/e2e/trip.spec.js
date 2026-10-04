import { test, expect } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { preferences, tripFixture, mappedFixture, routeFixture } from "../fixtures";
import { persistableItinerary } from "../../lib/schemas";

async function setup(page, context) {
  const token = await encode({ token: { name: "Demo traveler", email: "demo@example.test" }, secret: "wanderwise-e2e-only-not-a-production-secret", maxAge: 3600 });
  await context.addCookies([{ name: "next-auth.session-token", value: token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  // Mock only the external Maps SDK and HTTP providers; exercise real app components.
  await page.addInitScript(() => {
    class Map {
      constructor(element) { this.element = element; element.style.paddingTop = "160px"; }
      fitBounds() {} setCenter() {} setZoom() {}
    }
    class LatLngBounds { constructor() { this.points = []; } extend(point) { this.points.push(point); } isEmpty() { return !this.points.length; } getCenter() { return this.points[0]; } }
    class AdvancedMarkerElement {
      constructor({ content, map }) { this.content = content; this.map = map; }
      set map(map) { this.content.remove(); if (map) map.element.append(this.content); }
    }
    class Polyline {
      constructor({ map }) { this.element = document.createElement("span"); this.element.dataset.testid = "mock-route"; this.element.textContent = "Daily route"; this.setMap(map); }
      setMap(map) { this.element.remove(); if (map) map.element.append(this.element); }
    }
    class InfoWindow { setContent(content) { this.content = content; } open({ map }) { this.close(); map.element.append(this.content); } close() { this.content?.remove(); } }
    window.google = { maps: { event: { trigger() {} }, importLibrary: async (library) => library === "core" ? { LatLngBounds } : library === "marker" ? { AdvancedMarkerElement } : { Map, Polyline, InfoWindow } } };
  });
  const state = { trip: null, shareToken: "b".repeat(64), shared: false, requests: [], infoCalls: 0 };
  await page.route("**/api/**", async (route) => {
    const request = route.request(), path = new URL(request.url()).pathname, method = request.method();
    const body = method === "POST" || method === "PATCH" ? request.postDataJSON() : null;
    const send = (json, status = 200) => route.fulfill({ status, json });
    if (path === "/api/auth/session") return send({ user: { name: "Demo traveler", email: "demo@example.test" }, expires: "2099-01-01T00:00:00.000Z" });
    if (path === "/api/gemini") {
      if (body.type === "info") {
        state.infoCalls++;
        if (state.infoCalls === 1) return send({ status_message: "What dates, travelers, pace and transport do you prefer?", collected_details: { destination: "Paris, France", budget: "Affordable", interests: "Art and food" }, missing_fields: ["startDate", "endDate", "travelers", "pace", "transportPreference"] });
        return send({ status_message: "Ready to generate itinerary!", collected_details: preferences, missing_fields: [] });
      }
      if (body.type === "day") {
        const itinerary = structuredClone(body.itinerary);
        itinerary.locations[0].itinerary.find((day) => day.day === body.day).title = "A fresh day";
        return send({ ...itinerary, mapData: mappedFixture(itinerary) });
      }
      return send({ ...tripFixture(), mapData: mappedFixture() });
    }
    if (path === "/api/google/verify") return send({ days: mappedFixture(body.itinerary || state.trip.itinerary) });
    if (path === "/api/google/directions") { state.requests.push(body); return send(routeFixture); }
    if (path === "/api/trips" && method === "POST") {
      state.trip = { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: body.itinerary.title, itinerary: persistableItinerary(body.itinerary), sharingEnabled: false, updatedAt: new Date().toISOString() };
      return send({ trip: state.trip }, 201);
    }
    if (path === "/api/trips" && method === "GET") return send({ trips: state.trip ? [state.trip] : [] });
    if (path.startsWith("/api/trips/") && method === "PATCH") {
      if (body.name) state.trip.name = body.name;
      if (body.itinerary) state.trip.itinerary = persistableItinerary(body.itinerary);
      if (typeof body.sharing === "boolean") { state.shared = body.sharing; state.trip.sharingEnabled = body.sharing; }
      return send({ trip: state.trip, ...(body.sharing ? { shareToken: state.shareToken } : {}) });
    }
    if (path.startsWith("/api/trips/") && method === "DELETE") { state.trip = null; return send({ message: "Trip deleted." }); }
    if (path.startsWith("/api/trips/")) return send({ trip: state.trip });
    if (path.startsWith("/api/shared/")) return state.shared ? send({ trip: { name: state.trip.name, itinerary: state.trip.itinerary } }) : send({ error: "This link is invalid or sharing has been revoked." }, 404);
    return send({ error: "Unexpected API request" }, 500);
  });
  return state;
}
async function generate(page) {
  await page.goto("/trip");
  await page.getByRole("textbox", { name: "Trip preferences" }).fill("An affordable art and food trip to Paris");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByText("What dates, travelers, pace and transport do you prefer?")).toBeVisible();
  await page.getByRole("textbox", { name: "Trip preferences" }).fill("November 1–2 2026, two adults, balanced pace, walking");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Paris art and food" })).toBeVisible();
}
test("conversation → Google map → editing → save → rename → reopen → share → revoke", async ({ page, context }) => {
  const state = await setup(page, context);
  await generate(page);
  await page.screenshot({ path: test.info().outputPath("desktop-itinerary.png"), fullPage: true });
  await page.getByRole("button", { name: "Map & routes" }).click();
  await expect(page.getByRole("button", { name: "Day 1, stop 1: Louvre Museum" })).toBeVisible();
  await expect(page.getByTestId("mock-route")).toHaveCount(2);
  await page.getByRole("button", { name: "Day 2", exact: true }).click();
  await page.getByLabel("Day 2 transport").selectOption("driving");
  await expect.poll(() => state.requests.some((request) => request.profile === "driving")).toBe(true);
  await expect(page.getByTestId("mock-route")).toHaveCount(1);
  await page.getByRole("button", { name: "Itinerary", exact: true }).click();
  await page.getByRole("button", { name: "Move down Louvre Museum", exact: true }).click();
  await page.getByRole("button", { name: "Remove Musée d’Orsay", exact: true }).click();
  await page.getByRole("button", { name: "Regenerate day 2", exact: true }).click();
  await expect(page.getByRole("heading", { name: "A fresh day" })).toBeVisible();
  await page.getByRole("button", { name: "Save Trip", exact: true }).click();
  await page.getByRole("link", { name: "Saved - View trip" }).click();
  await expect(page.getByLabel("Day 2 transport")).toHaveValue("driving");
  await expect(page.getByRole("region", { name: "Day 1", exact: true }).locator("ol > li").first()).toContainText("Tuileries Garden");
  await expect(page.getByRole("button", { name: "Remove Musée d’Orsay", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "My Trips", exact: false }).click();
  await page.getByRole("button", { name: "Rename Paris art and food" }).click();
  await page.locator("article input").fill("Paris weekend");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Paris weekend" })).toBeVisible();
  await page.getByRole("link", { name: "View trip" }).click();
  await page.getByRole("button", { name: "Enable sharing" }).click();
  await expect(page.getByLabel("Read-only share link")).toHaveValue(new RegExp(`/shared/${state.shareToken}$`));
  await page.goto(`/shared/${state.shareToken}`);
  await expect(page.getByText("Shared itinerary · Read only")).toBeVisible();
  await expect(page.getByRole("button", { name: /Remove|Regenerate day|Save changes/ })).toHaveCount(0);
  await page.goto(`/trips/${state.trip._id}`);
  await page.getByRole("button", { name: "Revoke sharing" }).click();
  await expect(page.getByRole("button", { name: "Enable sharing" })).toBeVisible();
  await page.goto(`/shared/${state.shareToken}`);
  await expect(page.getByRole("heading", { name: "Shared trip unavailable" })).toBeVisible();
});
test("mobile layout supports stop edits without horizontal overflow", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, context); await generate(page);
  await page.getByRole("button", { name: "Remove Louvre Museum", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove Louvre Museum", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("mobile-itinerary.png"), fullPage: true });
});

test("exports the current itinerary through the PDF print dialog", async ({ page, context }) => {
  await setup(page, context); await generate(page);
  await page.evaluate(() => { window.print = () => { window.__wanderwisePrinted = true; }; });
  await page.getByRole("button", { name: "Export trip as PDF" }).click();
  await expect.poll(() => page.evaluate(() => window.__wanderwisePrinted)).toBe(true);
});
