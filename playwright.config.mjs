import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false, workers: 1, timeout: 60000,
  use: { baseURL: "http://localhost:3100", channel: process.env.PLAYWRIGHT_CHANNEL || "chrome", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: {
    command: "npx next dev --port 3100", url: "http://localhost:3100", reuseExistingServer: false, timeout: 120000,
    env: { NEXTAUTH_SECRET: "wanderwise-e2e-only-not-a-production-secret", NEXTAUTH_URL: "http://localhost:3100", NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "test-key", NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: "DEMO_MAP_ID" },
  },
});
