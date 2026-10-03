export const preferences = { destination: "Paris, France", startDate: "2026-11-01", endDate: "2026-11-02", travelers: "2 adults", budget: "Affordable", interests: "Art and food", pace: "balanced", transportPreference: "walking" };
export function tripFixture() {
  return { title: "Paris art and food", dates: "1–2 November 2026", preferences: { ...preferences }, locations: [{ city: "Paris, France", days: [1, 2], itinerary: [
    { day: 1, date: "2026-11-01", title: "Art by the river", description: "Explore Paris at your own pace.", transportMode: "walking", stops: [
      { name: "Louvre Museum", address: "Rue de Rivoli, Paris", placeId: "place-louvre", order: 1, estimatedVisitMinutes: 90, notes: "Book ahead" },
      { name: "Tuileries Garden", address: "Paris, France", placeId: "place-tuileries", order: 2, estimatedVisitMinutes: 60, notes: "Take a stroll" },
      { name: "Musée d’Orsay", address: "Paris, France", placeId: "place-orsay", order: 3, estimatedVisitMinutes: 90, notes: "Art collections" },
    ] },
    { day: 2, date: "2026-11-02", title: "City landmarks", description: "Discover another side of the city.", transportMode: "walking", stops: [
      { name: "Eiffel Tower", address: "Paris, France", placeId: "place-eiffel", order: 1, estimatedVisitMinutes: 60, notes: "Book ahead" },
      { name: "Champ de Mars", address: "Paris, France", placeId: "place-mars", order: 2, estimatedVisitMinutes: 60, notes: "Relax outdoors" },
    ] },
  ] }] };
}
export function mappedFixture(itinerary = tripFixture()) {
  return itinerary.locations.flatMap((location) => location.itinerary.map((day) => ({ day: day.day, city: location.city, stops: day.stops.map((stop, i) => ({ ...stop, status: "verified", coordinates: [2.29 + day.day * 0.01 + i * 0.005, 48.85 + i * 0.001], resolvedAddress: `${stop.name}, Paris, France`, attributions: [] })) })));
}
export const routeFixture = { distance: 2600, duration: 1800, geometry: { type: "LineString", coordinates: [[2.3, 48.85], [2.31, 48.86]] }, warnings: [] };
