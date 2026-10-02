"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { List, Map as MapIcon } from "lucide-react";
import ItineraryLayout from "@/components/ItineraryLayout";
import { editStop, flattenDays, stopKey, updateDay, validateSchedule } from "@/lib/itinerary";
import { persistableItinerary } from "@/lib/schemas";

const ItineraryMap = dynamic(() => import("@/components/map/ItineraryMap"), { ssr: false, loading: () => <p role="status" className="p-8">Opening your map…</p> });
async function post(url, body, signal) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed. Please try again.");
  return data;
}
export default function ItineraryWorkspace({ itinerary, onChange, shareToken, disabled = false, onBusyChange }) {
  const [view, setView] = useState("itinerary"), [selectedDay, setSelectedDay] = useState(null);
  const [mappedDays, setMappedDays] = useState([]), [routes, setRoutes] = useState({});
  const [locating, setLocating] = useState(false), [error, setError] = useState("");
  const [regenerating, setRegenerating] = useState(null), [retry, setRetry] = useState(0);
  const evidence = useRef(new Map()), routeCache = useRef(new Map()), seed = useRef(null);
  const days = useMemo(() => flattenDays(itinerary), [itinerary]);
  const readOnly = !onChange, busy = disabled || regenerating !== null;
  useEffect(() => { onBusyChange?.(regenerating !== null); }, [regenerating, onBusyChange]);

  useEffect(() => {
    if (!itinerary) return;
    const controller = new AbortController();
    if (seed.current !== itinerary.mapData) {
      seed.current = itinerary.mapData;
      itinerary.mapData?.forEach((day) => day.stops.forEach((stop) => evidence.current.set(stopKey(stop, day.city), stop)));
    }
    const assemble = () => days.map((day) => ({ ...day, stops: day.stops.map((stop) => ({ ...evidence.current.get(stopKey(stop, day.city)), ...stop })) }));
    async function locate() {
      setError("");
      const missing = days.some((day) => day.stops.some((stop) => !evidence.current.has(stopKey(stop, day.city))));
      if (!missing) { setMappedDays(assemble()); setLocating(false); return; }
      setMappedDays([]); setLocating(true);
      try {
        const data = await post("/api/google/verify", shareToken ? { shareToken } : { itinerary: persistableItinerary(itinerary) }, controller.signal);
        if (controller.signal.aborted) return;
        data.days.forEach((day) => day.stops.forEach((stop) => evidence.current.set(stopKey(stop, day.city), stop)));
        setMappedDays(assemble());
      } catch (problem) { if (!controller.signal.aborted) setError(problem.message); }
      finally { if (!controller.signal.aborted) setLocating(false); }
    }
    locate();
    return () => controller.abort();
  }, [itinerary, days, shareToken, retry]);

  useEffect(() => {
    const controller = new AbortController();
    const next = {};
    setRoutes({});
    async function calculate() {
      for (const day of mappedDays) {
        if (controller.signal.aborted) return;
        const coordinates = day.stops.filter((stop) => stop.status === "verified").map((stop) => stop.coordinates);
        if (coordinates.length < 2) continue;
        const key = JSON.stringify([coordinates, day.transportMode]);
        try {
          let route = routeCache.current.get(key);
          if (!route) {
            route = await post("/api/google/directions", shareToken ? { shareToken, day: day.day } : { coordinates, profile: day.transportMode }, controller.signal);
            if (controller.signal.aborted) return;
            routeCache.current.set(key, route);
          }
          next[day.day] = route;
        } catch (problem) { if (controller.signal.aborted) return; next[day.day] = { error: problem.message }; }
        setRoutes({ ...next });
      }
    }
    calculate();
    return () => controller.abort();
  }, [mappedDays, shareToken, retry]);

  const issues = useMemo(() => validateSchedule(itinerary, mappedDays, routes), [itinerary, mappedDays, routes]);
  function changeMode(day, mode) { if (!busy && onChange) onChange(updateDay(itinerary, day, (entry) => ({ ...entry, transportMode: mode }))); }
  function changeStop(day, index, action) { if (!busy && onChange) onChange(updateDay(itinerary, day, (entry) => ({ ...editStop(entry, index, action), description: "" }))); }
  async function regenerate(day) {
    if (busy || !onChange) return;
    setRegenerating(day); setError("");
    try {
      const result = await post("/api/gemini", { type: "day", day, itinerary: persistableItinerary(itinerary) });
      onChange(result);
    } catch (problem) { setError(problem.message); }
    finally { setRegenerating(null); }
  }
  function retryMaps() { evidence.current.clear(); routeCache.current.clear(); setRetry((value) => value + 1); }
  if (!itinerary) return <ItineraryLayout />;
  return <div className="flex h-full min-h-0 flex-col">
    <div className="flex gap-2 border-b bg-white p-2" aria-label="Itinerary views">
      {[["itinerary", List, "Itinerary"], ["map", MapIcon, "Map & routes"]].map(([value, Icon, label]) => <button key={value} aria-pressed={view === value} onClick={() => setView(value)} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${view === value ? "bg-blue-50 text-blue-700" : "text-slate-600"}`}><Icon size={16} />{label}</button>)}
    </div>
    <div className="border-b bg-white px-4 py-2 text-xs text-slate-600" aria-live="polite">
      {locating ? "Checking attractions with Google Maps…" : `${mappedDays.reduce((sum, day) => sum + day.stops.filter((stop) => stop.status === "verified").length, 0)} of ${days.reduce((sum, day) => sum + day.stops.length, 0)} stops matched on Google Maps`}
      <button onClick={retryMaps} disabled={locating || busy} className="ml-3 font-semibold text-blue-700 disabled:opacity-40">Recheck map data</button>
      <p className="mt-1 text-slate-500">Matches confirm map locations, not opening hours or availability. Search coverage varies by country.</p>
    </div>
    {error && <p role="alert" className="border-b bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="min-h-0 flex-1">
      {view === "map" ? <ItineraryMap days={mappedDays} routes={routes} selectedDay={selectedDay} onSelectDay={setSelectedDay} onMode={changeMode} readOnly={readOnly} busy={busy} locating={locating} />
        : <ItineraryLayout itinerary={itinerary} mappedDays={mappedDays} routes={routes} issues={issues} onStop={changeStop} onMode={changeMode} onRegenerate={regenerate} readOnly={readOnly} busy={busy} regenerating={regenerating} />}
    </div>
  </div>;
}
