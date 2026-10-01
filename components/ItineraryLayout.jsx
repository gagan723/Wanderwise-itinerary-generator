import { Calendar, Hotel, MapPin } from "lucide-react";

function ItineraryCard({ day, isLast }) {
  if (!day) return null;

  const attractions = day.stops?.length
    ? [...day.stops].sort((a, b) => a.order - b.order).map((stop) => stop.name)
    : day.attractions || [];

  return (
    <div className={`relative ${!isLast ? "pb-8" : ""}`}>
      {!isLast && (
        <div className="absolute left-6 top-16 h-full w-0.5 bg-gradient-to-b from-blue-300 to-gray-200" />
      )}
      <div className="flex items-start gap-4">
        <div className="z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
          {day.day}
        </div>
        <div className="flex-1 rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-3">
            <div className="mb-1 flex items-center gap-2 text-sm text-gray-500">
              <Calendar size={14} />
              {day.date}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{day.title}</h3>
          </div>
          <p className="mb-4 leading-relaxed text-gray-700">{day.description}</p>

          {day.accommodations?.length > 0 && (
            <div className="mb-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-600">
                <Hotel size={14} /> Accommodation
              </div>
              <div className="flex flex-wrap gap-1">
                {day.accommodations.map((accommodation, index) => (
                  <span key={`${accommodation}-${index}`} className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                    {accommodation}
                  </span>
                ))}
              </div>
            </div>
          )}

          {attractions.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-600">
                <MapPin size={14} /> Attractions
              </div>
              <div className="flex flex-wrap gap-1">
                {attractions.map((attraction, index) => (
                  <span key={`${attraction}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                    <span className="font-bold">{index + 1}</span> {attraction}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ItineraryLayout({ itinerary }) {
  if (!itinerary) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        <div className="text-center">
          <MapPin size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="mb-2 text-lg font-medium">No Itinerary Yet</h3>
          <p>Start chatting to generate your personalized travel itinerary!</p>
        </div>
      </div>
    );
  }

  const locations = Array.isArray(itinerary.locations) ? itinerary.locations : [];
  const allDays = locations
    .flatMap((location) => (Array.isArray(location.itinerary) ? location.itinerary : []))
    .sort((a, b) => a.day - b.day);
  const primaryCity = locations.length
    ? `${locations[0].city}${locations.length > 1 ? " & more" : ""}`
    : "Unknown location";

  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <h1 className="mb-2 text-2xl font-bold">{itinerary.title}</h1>
        <div className="flex flex-wrap items-center gap-4 text-blue-100">
          <div className="flex items-center gap-1"><Calendar size={16} />{itinerary.dates}</div>
          <div className="flex items-center gap-1"><MapPin size={16} />{primaryCity}</div>
        </div>
      </div>
      <div className="p-6">
        {allDays.map((day, index) => (
          <ItineraryCard key={`${day.day}-${index}`} day={day} isLast={index === allDays.length - 1} />
        ))}
      </div>
    </div>
  );
}
