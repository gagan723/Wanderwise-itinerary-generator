import { randomUUID } from "node:crypto";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(status, message, retryAfter) { super(message); this.status = status; this.retryAfter = retryAfter; }
}
export async function readJson(request, schema) {
  if (Number(request.headers.get("content-length")) > 200000) throw new ApiError(413, "Request is too large.");
  // Bound streamed bodies too; Content-Length is controlled by the caller.
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "A JSON body is required.");
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 200000) { await reader.cancel(); throw new ApiError(413, "Request is too large."); }
    chunks.push(Buffer.from(value));
  }
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ApiError(400, "Invalid JSON body."); }
  return schema.parse(body);
}
export function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", ...headers } });
}
export function apiHandler(label, handler) {
  return async (...args) => {
    const requestId = randomUUID(), started = Date.now();
    let response;
    try { response = await handler(...args); }
    catch (error) {
      const status = error instanceof ZodError ? 400 : error.status || 500;
      const message = error instanceof ZodError ? "Invalid request. Check your trip details and date range (maximum 14 days)." : status < 500 ? error.message : "This service is temporarily unavailable. Please try again.";
      response = json({ error: message, requestId }, status, error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {});
      // Never log prompts, email addresses, provider URLs, tokens, or itinerary data.
      console.error(JSON.stringify({ event: "api_error", endpoint: label, requestId, status, kind: error.name }));
    }
    response.headers.set("X-Request-Id", requestId);
    console.info(JSON.stringify({ event: "api_request", endpoint: label, requestId, status: response.status, durationMs: Date.now() - started }));
    return response;
  };
}
