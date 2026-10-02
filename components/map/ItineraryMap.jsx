"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { RouteSummary, TransportSelect } from "@/components/ItineraryLayout";

const colors = ["#2563eb", "#7c3aed", "#059669", "#e11d48", "#d97706", "#0891b2"];
let configured = false;
export default function ItineraryMap({ days, routes, selectedDay, onSelectDay, onMode, readOnly, busy, locating }) {
  const container = useRef(null), mapRef = useRef(null), libraries = useRef(null);
  const markers = useRef([]), lines = useRef([]), info = useRef(null);
  const [ready, setReady] = useState(false), [error, setError] = useState(""), [attempt, setAttempt] = useState(0);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";
  const activeDay = days.find((day) => day.day === selectedDay);
  useEffect(() => {
    if (!apiKey || !container.current) return;
    let cancelled = false, observer;
    setReady(false); setError("");
    async function initialize() {
      try {
        if (!configured) { setOptions({ key: apiKey, v: "weekly" }); configured = true; }
        const [maps, marker, core] = await Promise.all([importLibrary("maps"), importLibrary("marker"), importLibrary("core")]);
        if (cancelled || !container.current) return;
        libraries.current = { maps, marker, core };
        mapRef.current = new maps.Map(container.current, { center: { lat: 20, lng: 0 }, zoom: 2, mapId, mapTypeControl: false, streetViewControl: false, fullscreenControl: true });
        info.current = new maps.InfoWindow();
        observer = new ResizeObserver(() => window.google?.maps?.event?.trigger(mapRef.current, "resize"));
        observer.observe(container.current);
        setReady(true);
      } catch { if (!cancelled) setError("The map could not load. Check your connection and try again."); }
    }
    initialize();
    return () => {
      cancelled = true; observer?.disconnect(); info.current?.close();
      markers.current.forEach((marker) => { marker.map = null; }); markers.current = [];
      lines.current.forEach((line) => line.setMap(null)); lines.current = [];
      mapRef.current = null;
    };
  }, [apiKey, mapId, attempt]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const { maps, marker: markerLibrary, core } = libraries.current;
    markers.current.forEach((marker) => { marker.map = null; }); markers.current = [];
    lines.current.forEach((line) => line.setMap(null)); lines.current = [];
    info.current?.close();
    const visible = activeDay ? [activeDay] : days, bounds = new core.LatLngBounds();
    visible.forEach((day) => {
      const color = colors[(day.day - 1) % colors.length];
      day.stops.forEach((stop, index) => {
        if (stop.status !== "verified" || !stop.coordinates) return;
        const button = document.createElement("button");
        button.type = "button"; button.className = "wanderwise-map-marker"; button.style.background = color; button.textContent = String(index + 1);
        button.setAttribute("aria-label", `Day ${day.day}, stop ${index + 1}: ${stop.name}`);
        const position = { lng: stop.coordinates[0], lat: stop.coordinates[1] };
        const marker = new markerLibrary.AdvancedMarkerElement({ map, position, content: button, title: stop.name });
        button.addEventListener("click", () => {
          const content = document.createElement("div"), title = document.createElement("strong"), address = document.createElement("p");
          title.textContent = `Day ${day.day} · ${stop.name}`; address.textContent = stop.resolvedAddress || "";
          content.append(title, address);
          (stop.attributions || []).forEach((attribution) => { const p = document.createElement("p"); p.textContent = attribution.provider || ""; content.append(p); });
          info.current.setContent(content); info.current.open({ map, anchor: marker });
        });
        markers.current.push(marker); bounds.extend(position);
      });
      if (routes[day.day]?.geometry) {
        const path = routes[day.day].geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
        const line = new maps.Polyline({ path, strokeColor: color, strokeWeight: 5, strokeOpacity: 0.85, map });
        lines.current.push(line); path.forEach((position) => bounds.extend(position));
      }
    });
    if (!bounds.isEmpty()) {
      if (markers.current.length === 1) { map.setCenter(bounds.getCenter()); map.setZoom(14); }
      else map.fitBounds(bounds, { top: 120, bottom: 190, left: 45, right: 45 });
    }
  }, [ready, days, activeDay, routes]);
  if (!apiKey) return <div className="grid h-full min-h-96 place-items-center bg-slate-50 p-8 text-center"><div><h2 className="text-xl font-semibold">Map unavailable</h2><p className="mt-2 text-slate-600">The interactive map has not been configured. You can still review and edit your itinerary.</p></div></div>;
  return <div className="relative h-full min-h-[580px] bg-slate-100">
    <div ref={container} className="absolute inset-0" aria-label="Trip route map" />
    <div className="absolute left-3 right-14 top-3 z-10 flex max-h-28 flex-wrap gap-2 overflow-y-auto">
      <button aria-pressed={!activeDay} onClick={() => onSelectDay(null)} className={`rounded-full px-3 py-2 text-xs font-semibold shadow ${!activeDay ? "bg-slate-900 text-white" : "bg-white text-slate-800"}`}>Entire trip</button>
      {days.map((day) => <button key={day.day} aria-pressed={selectedDay === day.day} onClick={() => onSelectDay(day.day)} style={{ borderColor: colors[(day.day - 1) % colors.length] }} className={`rounded-full border-2 px-3 py-1.5 text-xs font-semibold shadow ${selectedDay === day.day ? "bg-slate-900 text-white" : "bg-white text-slate-800"}`}>Day {day.day}</button>)}
    </div>
    <div className="absolute bottom-10 left-3 right-14 z-10 max-h-48 overflow-y-auto rounded-xl bg-white/95 p-4 shadow-lg">
      {activeDay ? <><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Day {activeDay.day} · {activeDay.city}</h2>{!readOnly && <TransportSelect day={activeDay} onMode={onMode} disabled={busy} />}</div><RouteSummary route={routes[activeDay.day]} stops={activeDay.stops.filter((stop) => stop.coordinates).length} /></>
        : <><p className="text-sm font-semibold">Entire trip · {days.length} days · Select a day for route details.</p>{days.some((day) => ["walking", "cycling"].includes(day.transportMode)) && <p className="mt-1 text-xs text-slate-600">Walking and cycling routes may omit sidewalks or cycle paths. Use caution.</p>}</>}
      <p className="mt-2 text-xs text-amber-800">{(activeDay ? [activeDay] : days).reduce((sum, day) => sum + day.stops.filter((stop) => stop.status !== "verified").length, 0)} unverified stop(s) excluded from routes.</p>
      {(locating || !ready) && !error && <p role="status" className="mt-2 text-sm">{locating ? "Locating attractions…" : "Loading Google Maps…"}</p>}
      {activeDay && ["walking", "cycling"].includes(activeDay.transportMode) && <p className="mt-1 text-xs text-slate-600">Walking and cycling routes may omit sidewalks or cycle paths. Use caution.</p>}
      {error && <div role="alert" className="mt-2 text-sm text-red-800">{error}<button onClick={() => setAttempt((value) => value + 1)} className="ml-2 underline">Retry map</button></div>}
    </div>
  </div>;
}
