import { flattenDays } from "@/lib/itinerary";

const titleCase = (value) => value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "";

export default function TripPrintView({ itinerary, mappedDays = [], routes = {} }) {
  const days = flattenDays(itinerary);
  const preferences = itinerary.preferences || {};
  const overview = [
    ["Travelers", preferences.travelers],
    ["Budget", preferences.budget],
    ["Pace", titleCase(preferences.pace)],
    ["Interests", preferences.interests],
  ].filter(([, value]) => value);

  return <article className="trip-print-view" aria-hidden="true">
    <header className="trip-print-header">
      <p className="trip-print-brand">WanderWise / Trip itinerary</p>
      <h1>{itinerary.title}</h1>
      <p className="trip-print-subtitle">{itinerary.dates}</p>
      <p className="trip-print-cities">{itinerary.locations.map((location) => location.city).join(" / ")}</p>
    </header>

    {overview.length > 0 && <dl className="trip-print-overview">
      {overview.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>}

    <div className="trip-print-days">
      {days.map((day) => {
        const mapped = mappedDays.find((entry) => entry.day === day.day);
        const route = routes[day.day];
        return <section key={day.day} className="trip-print-day">
          <div className="trip-print-day-heading">
            <div>
              <p className="trip-print-kicker">Day {day.day} / {day.date} / {day.city}</p>
              <h2>{day.title}</h2>
            </div>
            <p className="trip-print-transport">{titleCase(day.transportMode)}</p>
          </div>
          {day.description && <p className="trip-print-description">{day.description}</p>}
          {route && !route.error && <p className="trip-print-route">Estimated route: {(route.distance / 1000).toFixed(1)} km / {Math.round(route.duration / 60)} min</p>}
          <ol className="trip-print-stops">
            {day.stops.map((stop, index) => {
              const checked = mapped?.stops[index];
              const address = checked?.resolvedAddress || stop.address;
              return <li key={`${stop.placeId || stop.name}-${index}`}>
                <span className="trip-print-number">{index + 1}</span>
                <div>
                  <h3>{stop.name}</h3>
                  {address && <p className="trip-print-address">{address}</p>}
                  <p className="trip-print-duration">Approx. {stop.estimatedVisitMinutes || 60} min{stop.notes ? ` / ${stop.notes}` : ""}</p>
                  {checked?.status === "verified" && <p className="trip-print-match">Matched on Google Maps</p>}
                </div>
              </li>;
            })}
          </ol>
          {!day.stops.length && <p className="trip-print-free-day">Free day</p>}
        </section>;
      })}
    </div>

    <footer className="trip-print-note">
      Travel times and visit durations are estimates. Confirm opening hours, availability, and route conditions before traveling.
      {mappedDays.length > 0 && <span> Location matches and canonical addresses are provided by Google Maps.</span>}
    </footer>
  </article>;
}
