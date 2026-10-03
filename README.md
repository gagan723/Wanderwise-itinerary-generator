# WanderWise

Turn a conversation into a checked, editable travel itinerary with Google Maps, save it privately, and optionally share a read-only link.

## Stack and MVP scope

- Next.js 15 App Router, React 19, NextAuth, MongoDB/Mongoose.
- Gemini structured JSON plus independent Zod validation.
- Google **Places API (New)** Text Search for verified attraction discovery, Place Details for saved-trip refreshes, **Routes API** for travel estimates, and **Maps JavaScript API** for the interactive map. No Mapbox dependency or mixed map providers.
- Conversational collection of destination, inclusive dates, travelers, budget, interests, pace, and walking/cycling/driving preference.
- Numbered markers, day filters, color-coded daily routes, whole-trip overview, marker details, and automatic bounds.
- Remove/reorder stops, change daily transport, regenerate just one day, and recalculate affected routes.
- Private owner-scoped saved trips: save, rename, update, delete, and reopen.
- Optional public read-only links using 256-bit random tokens; owners can replace or revoke links. Only a SHA-256 token hash is stored.

The MVP caps each trip at **14 days, 12 stops per day, and 80 stops total**. It does not book travel, handle payments, or provide turn-by-turn navigation.

## Local setup

Use Node.js 22.12+ (Node 24 is used for local verification).

```sh
npm install
```

Copy `.env.example` to `.env.local` and fill in the following values:

| Variable | Purpose |
| --- | --- |
| `NEXTAUTH_SECRET` | Strong random session-signing secret |
| `NEXTAUTH_URL` | App origin, e.g. `http://localhost:3000` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth credentials; separate from Maps keys |
| `MONGO` | MongoDB connection URI |
| `GEMINI_API_KEY` | Server-only Gemini key |
| `GEMINI_MODEL` | Optional model override, defaults to `gemini-2.5-flash` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Browser Maps JavaScript key |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Google Map ID for Advanced Markers; `DEMO_MAP_ID` is used locally if omitted |
| `GOOGLE_MAPS_SERVER_API_KEY` | Server-only Places and Routes key |

In Google Cloud:

1. Enable billing and **Maps JavaScript API**, **Places API (New)**, and **Routes API**. The previous geocoding-only server-key restriction is insufficient.
2. Restrict the browser key to Maps JavaScript API and your allowed website referrers, including localhost during development. Browser keys are intentionally public.
3. Restrict the server key to Places API (New) and Routes API. Add server IP restrictions where hosting provides stable outbound addresses; do not apply browser referrer restrictions to this key. Never use this key in a `NEXT_PUBLIC_` variable.
4. Configure Google OAuth callbacks, including `http://localhost:3000/api/auth/callback/google` and the equivalent production URL.
5. Configure Google Cloud quotas and billing alerts for your project. Application limits do not replace provider quotas or a billing budget.

```sh
npm run dev
```

Open `http://localhost:3000`. Missing map credentials leave the itinerary usable with explicit unverified statuses and an unavailable-map state. Missing MongoDB or Gemini credentials prevent authenticated generation/persistence.

## How verification works

Gemini first creates the dated city-and-day outline without attractions. For each unique destination, the server makes one Google Places Text Search using the traveler's interests and requests at most 20 candidates. It makes exactly one complementary fallback search only when the first pool is smaller than the pace minimum: two places per relaxed day, three per balanced day, or four per busy day.

Closed places, administrative regions, duplicate Place IDs, and results without coordinates are removed. Gemini then selects only from those candidate IDs, and the server rejects invented or duplicate IDs. If the verified pool remains small, the plan uses lighter or rest days instead of unverified suggestions. A destination with no valid candidates returns a clear error. This limits new-trip discovery to at most two Text Search requests per destination and avoids a Text Search for every generated stop.

Newly generated stops retain their Place IDs. Reopening a saved trip refreshes those exact IDs with Place Details; older trips without IDs retain the conservative name-and-city Text Search fallback. Removed, closed, or stale places remain visibly unresolved and are excluded from routes. Provider outages are reported as unavailable rather than treated as evidence that a place does not exist.

Deterministic checks flag missing/request-mismatched dates, duplicate attractions, excessive stop counts for the selected pace, over three hours of travel, over ten hours of visits/travel, and substantial geographic backtracking using a nearest-neighbor comparison. These are advisory checks, not opening-hour validation or a guaranteed route optimizer. Removing/reordering/replacing a stop clears the original day's narrative to avoid stale descriptions.

## Temporary provider data and sharing

- Coordinates, canonical Google addresses, attribution, verification status, discovery pools, and routes stay in request/open-page memory. Responses use `Cache-Control: private, no-store`; no localStorage, persistent map cache, or provider response logging is used.
- Every save/update projects itinerary data through a Zod whitelist. Place IDs are persisted so saved trips can refresh the exact locations; all other Google-derived fields are stripped. Original/generated trip text and preferences are also persisted.
- Duplicate lookups reuse results within a verification request; edits reuse results in the currently open page. Unmounting the workspace discards that cache.
- Public requests load the saved itinerary from the token on the server. Visitors cannot supply arbitrary stops or transport modes to the public mapping endpoints. No write endpoint accepts a sharing token as authorization.
- Public responses exclude account/owner details; the itinerary and its saved preferences are visible to anyone with the link. Replacing or revoking a token prevents future access, but cannot erase copies already viewed by recipients.
- Shared pages request no indexing and use a no-referrer policy. `/privacy` and `/terms` describe the application's data handling and link to Google's policies.

Configure Google Cloud quotas and billing alerts before production use. The application-level search cap bounds each generation request, but it does not replace provider quotas or billing controls.

## Reliability and security

All private APIs authenticate server-side. Reads, writes, renames, sharing changes, and deletes filter by both trip ID and signed-in owner. The middleware is an additional page guard, not the authorization boundary.

Requests use bounded JSON bodies and Zod validation. Google calls have timeouts and field masks. MongoDB-backed atomic fixed-window counters work across app instances: 12 AI requests/minute/user, 8 verification requests/minute/user or shared link, 60 private or 30 public route requests/minute, and an aggregate 240 Google server requests/minute. Save/update endpoints are also limited. A `Retry-After` header accompanies throttling. MongoDB must permit the application to create the RequestLimit collection and TTL index; the `_id` counter key provides atomic uniqueness. Database failures fail closed.

API logs contain request IDs, route labels, response status, elapsed time, and error classes, without raw prompts, provider response bodies, keys, or sharing tokens. Forward these logs to your hosting platform's monitoring system. Configure your hosting access logs separately if they record full public-link URLs.

## Verification

```sh
npm test
npm run lint
npm run build
npm run test:e2e
```

Unit and API integration tests cover AI output validation, date coverage, edits, schedule checks, location matching/replacement/outages, transport modes, ownership, payload rejection, and share rotation/revocation. API tests execute the real route handlers and validation/access layers with mocked MongoDB/provider boundaries.

Playwright tests use a dedicated localhost server on port 3100 and a signed test session. They exercise conversation → map → transport/editing → save → rename → reopen → share → revoke, plus mobile layout. Gemini, database HTTP responses, and Google Maps are mocked to avoid API charges. They do **not** establish that production Google keys, billing, OAuth, or MongoDB connectivity are correctly configured. The default browser is installed Chrome; set `PLAYWRIGHT_CHANNEL=msedge` to use Edge instead.

Before deployment, run the same demo with your configured services and check provider quotas, OAuth callback URLs, the Map ID, MongoDB indexes, and production key restrictions. The generation route allows up to 300 seconds and mapping routes up to 180 seconds; hosting must support these request durations. Nothing is deployed by the test commands.

## Demo

Sign in and request an affordable art and food trip to Paris. Supply exact dates, two travelers, a balanced pace, and walking. Open Map & routes, change Day 2 to driving, remove/reorder a stop, save, rename in My Trips, reopen, enable sharing, and revoke the link.

## Provider references

- [Places Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search)
- [Routes API](https://developers.google.com/maps/documentation/routes/compute_route_directions)
- [Places attribution and storage policies](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Google Maps key security](https://developers.google.com/maps/api-security-best-practices)

Only claim measured latency, test coverage, usage, or traffic in a portfolio after collecting real measurements.
