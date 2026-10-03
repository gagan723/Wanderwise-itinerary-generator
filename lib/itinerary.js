export function flattenDays(itinerary) {
  return (itinerary?.locations || []).flatMap((location) => location.itinerary.map((day) => ({ ...day, city: location.city, transportMode: day.transportMode || "walking", stops: day.stops ?? (day.attractions || []).map((name, index) => ({ name, address: "", order: index + 1 })) }))).sort((a, b) => a.day - b.day);
}
export function stopKey(stop, city) {
  return stop.placeId ? JSON.stringify(["place", stop.placeId]) : JSON.stringify(["legacy", city, stop.name, stop.address || ""]);
}
export function updateDay(itinerary, number, transform) {
  return { ...itinerary, locations: itinerary.locations.map((location) => ({ ...location,
    itinerary: location.itinerary.map((day) => day.day !== number ? day : transform(day)),
  })) };
}
export function editStop(day, index, action) {
  const stops = [...day.stops];
  if (action === "remove") stops.splice(index, 1);
  else {
    const target = index + (action === "up" ? -1 : 1);
    if (target < 0 || target >= stops.length) return day;
    [stops[index], stops[target]] = [stops[target], stops[index]];
  }
  return { ...day, stops: stops.map((stop, i) => ({ ...stop, order: i + 1 })), attractions: stops.map((stop) => stop.name) };
}
export function requestedDates(preferences) {
  if (!preferences?.startDate || !preferences?.endDate) return [];
  const start = Date.parse(preferences.startDate), end = Date.parse(preferences.endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > 13 * 86400000) return [];
  return Array.from({ length: (end - start) / 86400000 + 1 }, (_, i) => new Date(start + i * 86400000).toISOString().slice(0, 10));
}
export function distanceKm(a, b) {
  const rad = (x) => x * Math.PI / 180;
  const dLat = rad(b[1] - a[1]), dLon = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function validateSchedule(itinerary, mappedDays = [], routes = {}) {
  if (!itinerary) return [];
  const issues = [], seen = new Set(), days = flattenDays(itinerary);
  const add = (code, day, message) => issues.push({ code, day, message });
  const expected = requestedDates(itinerary.preferences);
  expected.forEach((date, i) => {
    if (!days.some((day) => day.day === i + 1 && day.date === date)) add("date", i + 1, `Day ${i + 1} must cover ${date}.`);
  });
  for (const day of days) {
    if (expected.length && !expected.includes(day.date)) add("date", day.day, "This day falls outside the requested dates.");
    const limit = { relaxed: 4, balanced: 6, busy: 8 }[itinerary.preferences?.pace] || 6;
    if (day.stops.length > limit) add("stops", day.day, `Day ${day.day} has ${day.stops.length} stops; consider ${limit} or fewer for your pace.`);
    if (!day.stops.length) add("empty", day.day, `Day ${day.day} has no stops. Regenerate it or keep it as a rest day.`);
    for (const stop of day.stops) {
      const key = `${day.city}:${stop.name}`.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
      if (seen.has(key)) add("duplicate", day.day, `${stop.name} appears more than once in this trip.`);
      seen.add(key);
    }
    const mapped = mappedDays.find((entry) => entry.day === day.day);
    if (mapped) {
      const unresolved = mapped.stops.filter((stop) => stop.status !== "verified");
      if (unresolved.length) add("unresolved", day.day, `${unresolved.length} stop(s) on Day ${day.day} could not be verified. They are excluded from routes.`);
      const points = mapped.stops.filter((stop) => stop.coordinates).map((stop) => stop.coordinates);
      if (points.length >= 3) {
        const length = (list) => list.slice(1).reduce((sum, point, i) => sum + distanceKm(list[i], point), 0);
        const remaining = points.slice(1), nearest = [points[0]];
        while (remaining.length) {
          let best = 0;
          remaining.forEach((point, i) => { if (distanceKm(nearest.at(-1), point) < distanceKm(nearest.at(-1), remaining[best])) best = i; });
          nearest.push(remaining.splice(best, 1)[0]);
        }
        if (length(points) > length(nearest) * 1.4 + 1) add("order", day.day, `Day ${day.day} may involve backtracking. Try reordering nearby stops.`);
      }
    }
    const route = routes[day.day];
    if (route?.duration > 3 * 3600) add("travel", day.day, `Day ${day.day} involves over three hours of travel.`);
    const visitMinutes = day.stops.reduce((sum, stop) => sum + (stop.estimatedVisitMinutes || 60), 0);
    if (visitMinutes + (route?.duration || 0) / 60 > 600) add("long", day.day, `Day ${day.day} exceeds ten hours of visits and travel.`);
  }
  return issues;
}
