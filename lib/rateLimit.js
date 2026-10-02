import { createHash } from "node:crypto";
import mongoose from "mongoose";
import connectToDatabase from "./mongodb";
import { ApiError } from "./api";

const schema = new mongoose.Schema({ _id: String, count: Number, expiresAt: Date });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Limit = mongoose.models.RequestLimit || mongoose.model("RequestLimit", schema);

// Shared, atomic fixed windows work across serverless instances; TTL is cleanup only.
export async function rateLimit(key, limit, windowMs = 60000) {
  await connectToDatabase();
  const now = Date.now(), window = Math.floor(now / windowMs);
  const _id = createHash("sha256").update(`${key}:${window}`).digest("hex");
  const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 2) * windowMs) } };
  let record;
  try { record = await Limit.findOneAndUpdate({ _id }, update, { upsert: true, new: true }); }
  catch (error) {
    if (error.code !== 11000) throw error;
    record = await Limit.findOneAndUpdate({ _id }, { $inc: { count: 1 } }, { new: true });
  }
  if (record.count > limit) throw new ApiError(429, "Too many requests. Please try again shortly.", Math.ceil(((window + 1) * windowMs - now) / 1000));
}
