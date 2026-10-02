import { ArrowDown, ArrowUp, MapPin, Trash2 } from "lucide-react";
import { flattenDays } from "@/lib/itinerary";
import GoogleAttribution from "@/components/GoogleAttribution";

export function RouteSummary({ route, stops }) {
  if (route?.error) return <p role="status" className="text-sm text-amber-800">Route unavailable: {route.error}</p>;
  if (!route) return <p className="text-sm text-slate-500">{stops < 2 ? "At least two verified stops are needed for a route." : "Calculating route…"}</p>;
  return <div><p className="text-sm font-medium text-blue-800">{(route.distance / 1000).toFixed(1)} km · {Math.round(route.duration / 60)} min travel <span className="font-normal text-slate-500">(estimate, verified stops only)</span></p><GoogleAttribution />{route.warnings?.map((warning, index) => <p key={index} className="mt-1 text-xs text-amber-800">{warning}</p>)}</div>;
}
export function TransportSelect({ day, onMode, disabled }) {
  return <label className="flex items-center gap-2 text-sm text-slate-600">Transport
    <select aria-label={`Day ${day.day} transport`} value={day.transportMode} onChange={(event) => onMode(day.day, event.target.value)} disabled={disabled} className="rounded-lg border bg-white p-2 text-slate-900 disabled:opacity-60">
      <option value="walking">Walking</option><option value="cycling">Cycling</option><option value="driving">Driving</option>
    </select>
  </label>;
}
export default function ItineraryLayout({ itinerary, mappedDays = [], routes = {}, issues = [], onStop, onMode, onRegenerate, readOnly, busy, regenerating }) {
  if (!itinerary) return <div className="grid h-full min-h-80 place-items-center p-8 text-center text-slate-500"><div><MapPin size={48} className="mx-auto mb-4 text-blue-300" /><h2 className="text-xl font-semibold">Your next adventure starts here</h2><p className="mt-2">Share your trip details to build a day-by-day plan.</p></div></div>;
  const days = flattenDays(itinerary);
  return <div className="h-full overflow-y-auto">
    <header className="bg-gradient-to-r from-blue-700 to-indigo-600 p-6 text-white"><h1 className="text-2xl font-bold">{itinerary.title}</h1><p className="mt-2 text-blue-100">{itinerary.dates} · {itinerary.locations.map((location) => location.city).join(" · ")}</p></header>
    <div className="space-y-5 p-4 sm:p-6">
      {issues.length > 0 && <details className="rounded-xl border border-amber-200 bg-amber-50 p-4" open><summary className="cursor-pointer font-semibold text-amber-900">{issues.length} schedule check{issues.length === 1 ? "" : "s"} to review</summary><ul className="mt-2 space-y-1 text-sm text-amber-900">{issues.map((issue, index) => <li key={index}>• {issue.message}</li>)}</ul></details>}
      {days.map((day) => {
        const mapped = mappedDays.find((entry) => entry.day === day.day);
        const count = mapped?.stops.filter((stop) => stop.status === "verified").length || 0;
        return <section key={day.day} aria-label={`Day ${day.day}`} className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-blue-700">Day {day.day} · {day.date} · {day.city}</p><h2 className="mt-1 text-lg font-bold text-slate-900">{day.title}</h2></div>
            {!readOnly && <button disabled={busy} onClick={() => onRegenerate(day.day)} className="rounded-lg border px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">{regenerating === day.day ? "Regenerating…" : `Regenerate day ${day.day}`}</button>}
          </div>
          {day.description && <p className="mt-3 text-sm leading-relaxed text-slate-600">{day.description}</p>}
          <div className="my-4 flex flex-wrap items-center justify-between gap-3"><RouteSummary route={routes[day.day]} stops={count} />{readOnly ? <span className="text-sm capitalize text-slate-600">{day.transportMode}</span> : <TransportSelect day={day} onMode={onMode} disabled={busy} />}</div>
          <ol className="space-y-3">
            {day.stops.map((stop, index) => {
              const checked = mapped?.stops[index];
              return <li key={`${stop.name}-${index}`} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">{index + 1}</span><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{stop.name}</p><div className="mt-1 rounded border-l-2 border-slate-200 pl-2"><p className="text-xs text-slate-500">{checked?.resolvedAddress || stop.address}</p>{checked?.resolvedAddress && <GoogleAttribution attributions={checked.attributions} />}</div>
                  <p className={`mt-1 text-xs font-medium ${checked?.status === "verified" ? "text-emerald-700" : "text-amber-800"}`}>{checked?.status === "verified" ? "Matched on Google Maps" : checked?.reason || "Not yet verified"}</p>
                  {checked?.replacedName && <p className="text-xs text-slate-500">Replacement for unresolved suggestion: {checked.replacedName}</p>}
                  <p className="mt-1 text-xs text-slate-500">Approx. {stop.estimatedVisitMinutes || 60} min visit{stop.notes ? ` · ${stop.notes}` : ""}</p>
                </div></div>
                {!readOnly && <div className="mt-2 flex justify-end gap-1">{[["up", ArrowUp, index === 0], ["down", ArrowDown, index === day.stops.length - 1], ["remove", Trash2, false]].map(([action, Icon, unavailable]) => <button key={action} aria-label={`${action === "remove" ? "Remove" : `Move ${action}`} ${stop.name}`} disabled={busy || unavailable} onClick={() => onStop(day.day, index, action)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-25"><Icon size={16} /></button>)}</div>}
              </li>;
            })}
          </ol>
          {!day.stops.length && <p className="py-4 text-sm text-slate-500">A free day. Regenerate to add a new set of stops.</p>}
        </section>;
      })}
      <p className="text-xs text-slate-500">Schedule checks are estimates; confirm opening hours before visiting.</p>
    </div>
  </div>;
}
