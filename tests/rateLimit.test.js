import { beforeEach, expect, it, vi } from "vitest";
const store = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("mongoose", () => {
  class Schema { index() {} }
  return { default: { Schema, models: { RequestLimit: { findOneAndUpdate: store.update } } } };
});
vi.mock("@/lib/mongodb", () => ({ default: vi.fn() }));
import { rateLimit } from "@/lib/rateLimit";
beforeEach(() => { store.update.mockReset(); vi.useRealTimers(); });
it("uses one atomic increment, hashed keys, expiry and a retry interval", async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-02T00:00:15Z"));
  store.update.mockResolvedValue({ count: 13 });
  await expect(rateLimit("ai:private-owner", 12)).rejects.toMatchObject({ status: 429, retryAfter: 45 });
  const [filter, update, options] = store.update.mock.calls[0];
  expect(filter._id).toMatch(/^[a-f0-9]{64}$/); expect(filter._id).not.toContain("private-owner");
  expect(update.$inc).toEqual({ count: 1 }); expect(update.$setOnInsert.expiresAt).toBeInstanceOf(Date);
  expect(options).toEqual({ upsert: true, new: true });
});
it("recovers an insert race without resetting the shared counter", async () => {
  store.update.mockRejectedValueOnce({ code: 11000 }).mockResolvedValueOnce({ count: 2 });
  await rateLimit("key", 5);
  expect(store.update).toHaveBeenCalledTimes(2);
  expect(store.update.mock.calls[1][1]).toEqual({ $inc: { count: 1 } });
  expect(store.update.mock.calls[1][2]).toEqual({ new: true });
});
it("fails closed when the shared store is unavailable", async () => {
  store.update.mockRejectedValue(new Error("Database unavailable"));
  await expect(rateLimit("key", 5)).rejects.toThrow("Database unavailable");
});
