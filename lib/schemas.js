import { z } from "zod";

const text = (max = 500) => z.string().trim().min(1).max(max);
export const transportSchema = z.enum(["walking", "cycling", "driving"]);
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Use a real calendar date (YYYY-MM-DD).");
export const detailShape = {
  destination: text(200), startDate: dateSchema, endDate: dateSchema,
  travelers: text(120), budget: text(200), interests: text(500),
  pace: z.enum(["relaxed", "balanced", "busy"]), transportPreference: transportSchema,
  specificRequests: z.string().max(1000).optional(),
  accommodationType: z.string().max(200).optional(),
};
export const partialDetailsSchema = z.object(Object.fromEntries(
  Object.entries(detailShape).map(([key, schema]) => [key, schema.nullish()])
));
export const requiredDetails = ["destination", "startDate", "endDate", "travelers", "budget", "interests", "pace", "transportPreference"];
export const preferencesSchema = z.object(detailShape).refine((value) => {
  const days = (Date.parse(value.endDate) - Date.parse(value.startDate)) / 86400000 + 1;
  return days >= 1 && days <= 14;
}, "Choose an end date on or after the start date, within 14 days.");
export const stopSchema = z.object({
  name: text(200), address: z.string().trim().max(400).default(""),
  placeId: text(300).optional(),
  order: z.number().int().min(1).max(12),
  estimatedVisitMinutes: z.number().int().min(5).max(720).default(60),
  notes: z.string().max(1000).default(""),
});
const rawDaySchema = z.object({
  day: z.number().int().min(1).max(14), title: text(200), date: text(100),
  description: z.string().max(3000).default(""),
  transportMode: transportSchema.default("walking"),
  stops: z.array(stopSchema).max(12),
  accommodations: z.array(text(200)).max(5).default([]),
  attractions: z.array(text(200)).max(12).default([]),
});
// Keep older saved plans that only have attraction names usable.
export const daySchema = z.preprocess((value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return { ...value, stops: value.stops ?? (Array.isArray(value.attractions) ? value.attractions.map((name, index) => ({ name, address: "", order: index + 1 })) : []) };
}, rawDaySchema);
export const itinerarySchema = z.object({
  title: text(200), dates: text(200), preferences: preferencesSchema.optional(),
  locations: z.array(z.object({ city: text(200), days: z.array(z.number().int().min(1).max(14)).max(14), itinerary: z.array(daySchema).min(1).max(14) })).min(1).max(14),
}).superRefine((value, ctx) => {
  const days = value.locations.flatMap((location) => location.itinerary);
  if (days.length > 14 || new Set(days.map((day) => day.day)).size !== days.length)
    ctx.addIssue({ code: "custom", message: "Use at most 14 uniquely numbered days." });
  if (days.reduce((n, day) => n + day.stops.length, 0) > 80)
    ctx.addIssue({ code: "custom", message: "An itinerary can contain at most 80 stops." });
});

// A whitelist projection: transient provider data must never enter MongoDB.
export function persistableItinerary(value) {
  const parsed = itinerarySchema.parse(value);
  parsed.locations.forEach((location) => {
    location.days = location.itinerary.map((day) => day.day);
    location.itinerary.forEach((day) => {
      day.stops = day.stops.map((stop, index) => ({ ...stop, order: index + 1 }));
      day.attractions = day.stops.map((stop) => stop.name);
    });
  });
  return parsed;
}
export const saveTripSchema = z.object({ name: text(100).optional(), itinerary: itinerarySchema });
export const updateTripSchema = z.object({ name: text(100).optional(), itinerary: itinerarySchema.optional(), sharing: z.boolean().optional() }).strict()
  .refine((body) => Object.keys(body).length > 0, "No changes supplied.");
export const aiRequestSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("info"), userMessage: text(2000), context: partialDetailsSchema.default({}) }),
  z.object({ type: z.literal("itinerary"), userMessage: text(2000), context: preferencesSchema }),
  z.object({ type: z.literal("day"), itinerary: itinerarySchema, day: z.number().int().min(1).max(14) }),
]);
export const coordinateSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
export const directionsSchema = z.object({ coordinates: z.array(coordinateSchema).min(2).max(12), profile: transportSchema });
export const shareTokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
