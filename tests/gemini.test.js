import { beforeEach, expect, it, vi } from "vitest";
const model = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock("@google/generative-ai", () => ({ GoogleGenerativeAI: class { getGenerativeModel() { return model; } } }));
import { askGemini } from "@/lib/gemini";
import { preferences } from "./fixtures";
const reply = (body) => model.generateContent.mockResolvedValue({ response: { text: () => JSON.stringify(body) } });
beforeEach(() => { vi.stubEnv("GEMINI_API_KEY", "test"); });
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
