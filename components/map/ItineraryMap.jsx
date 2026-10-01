"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import {
  Bike,
  Car,
  Footprints,
  LoaderCircle,
  MapPin,
  Route,
} from "lucide-react";

let configuredKey;

function configureGoogleMaps(key) {
  if (configuredKey) return;
  setOptions({ key, v: "weekly" });
  configuredKey = key;
}

function formatDistance(meters) {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
}

function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
}

function createInfoContent(stop) {
  const content = document.createElement("div");
  content.className = "wanderwise-google-popup";
  const title = document.createElement("strong");
  title.textContent = stop.name;
  const detail = document.createElement("span");
  detail.textContent = `Day ${stop.day} · ${stop.city}`;
  content.append(title, detail);
  return content;
}

export default function ItineraryMap({ itinerary }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const mapsLibraryRef = useRef(null);
  const markerLibraryRef = useRef(null);
  const markersRef = useRef([]);
  const routeRef = useRef(null);
  const infoWindowRef = useRef(null);
  const [mappedDays, setMappedDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [profile, setProfile] = useState("walking");
  const [routeSummary, setRouteSummary] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [stopsLoading, setStopsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";
  const activeDay = useMemo(
    () => mappedDays.find((day) => day.day === selectedDay),
    [mappedDays, selectedDay]
  );
  const visibleStops = useMemo(() => {
    const days = activeDay ? [activeDay] : mappedDays;
    return days.flatMap((day) =>
      day.stops
        .filter((stop) => Array.isArray(stop.coordinates))
        .map((stop) => ({ ...stop, day: day.day, city: day.city }))
    );
  }, [activeDay, mappedDays]);

  useEffect(() => {
    if (!apiKey || !containerRef.current || mapRef.current) return;
    let cancelled = false;

    async function initializeMap() {
      try {
        configureGoogleMaps(apiKey);
        const [mapsLibrary, markerLibrary] = await Promise.all([
          importLibrary("maps"),
          importLibrary("marker"),
        ]);
        if (cancelled || !containerRef.current) return;

        mapsLibraryRef.current = mapsLibrary;
        markerLibraryRef.current = markerLibrary;
        mapRef.current = new mapsLibrary.Map(containerRef.current, {
          center: { lat: 20, lng: 0 },
          zoom: 2,
          mapId,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        infoWindowRef.current = new mapsLibrary.InfoWindow();
        setMapReady(true);
      } catch {
        if (!cancelled) setMessage("Google Maps could not be loaded.");
      }
    }

    initializeMap();
    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => {
        marker.map = null;
      });
      markersRef.current = [];
      if (routeRef.current) routeRef.current.setMap(null);
      routeRef.current = null;
      mapRef.current = null;
    };
  }, [apiKey, mapId]);

  useEffect(() => {
    if (!itinerary) return;
    let cancelled = false;

    async function locateStops() {
      setStopsLoading(true);
      setMessage("");
      try {
        const response = await fetch("/api/google/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locations: itinerary.locations }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load map data.");
        if (cancelled) return;

        setMappedDays(data.days || []);
        setSelectedDay(data.days?.[0]?.day ?? null);
        setProfile(data.days?.[0]?.transportMode || "walking");
      } catch (error) {
        if (!cancelled) setMessage(error.message);
      } finally {
        if (!cancelled) setStopsLoading(false);
      }
    }

    locateStops();
    return () => {
      cancelled = true;
    };
  }, [itinerary]);

  useEffect(() => {
    const map = mapRef.current;
    const { LatLngBounds } = mapsLibraryRef.current || {};
    const { AdvancedMarkerElement } = markerLibraryRef.current || {};
    if (!mapReady || !map || !LatLngBounds || !AdvancedMarkerElement) return;

    markersRef.current.forEach((marker) => {
      marker.map = null;
    });
    markersRef.current = [];
    if (!visibleStops.length) return;

    const bounds = new LatLngBounds();
    visibleStops.forEach((stop, index) => {
      const markerContent = document.createElement("button");
      markerContent.type = "button";
      markerContent.className = "wanderwise-map-marker";
      markerContent.textContent = String(index + 1);
      markerContent.setAttribute("aria-label", `${index + 1}. ${stop.name}`);
      const position = { lat: stop.coordinates[1], lng: stop.coordinates[0] };
      const marker = new AdvancedMarkerElement({
        map,
        position,
        content: markerContent,
        title: stop.name,
      });
      markerContent.addEventListener("click", () => {
        infoWindowRef.current.setContent(createInfoContent(stop));
        infoWindowRef.current.open({ map, anchor: marker });
      });
      markersRef.current.push(marker);
      bounds.extend(position);
    });

    if (visibleStops.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, 70);
    }
  }, [mapReady, visibleStops]);

  useEffect(() => {
    const map = mapRef.current;
    const { Polyline } = mapsLibraryRef.current || {};
    if (!mapReady || !map || !Polyline) return;
    let cancelled = false;

    const clearRoute = () => {
      setRouteSummary(null);
      if (routeRef.current) routeRef.current.setMap(null);
      routeRef.current = null;
    };

    async function drawRoute() {
      const coordinates =
        activeDay?.stops
          .filter((stop) => Array.isArray(stop.coordinates))
          .slice(0, 27)
          .map((stop) => stop.coordinates) || [];

      clearRoute();
      if (coordinates.length < 2) return;

      try {
        const response = await fetch("/api/google/directions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coordinates, profile }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (cancelled) return;

        routeRef.current = new Polyline({
          path: data.path,
          geodesic: true,
          strokeColor: "#2563eb",
          strokeOpacity: 0.88,
          strokeWeight: 5,
          map,
        });
        setRouteSummary({ distance: data.distance, duration: data.duration });
      } catch (error) {
        if (!cancelled) setMessage(error.message || "No route was found.");
      }
    }

    drawRoute();
    return () => {
      cancelled = true;
    };
  }, [activeDay, mapReady, profile]);

  if (!apiKey) {
    return (
      <div className="h-full grid place-items-center p-8 text-center bg-slate-50">
        <div className="max-w-md">
          <MapPin className="mx-auto mb-4 text-blue-500" size={42} />
          <h3 className="text-lg font-semibold text-slate-900">
            Connect Google Maps
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Add the Google Maps browser and server keys to your environment,
            then restart Wanderwise.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[520px] bg-slate-100">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="absolute left-4 right-16 top-4 z-10 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedDay(null)}
          className={`rounded-full px-3 py-2 text-xs font-semibold shadow-sm ${
            selectedDay === null
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Entire trip
        </button>
        {mappedDays.map((day) => (
          <button
            key={day.day}
            onClick={() => {
              setSelectedDay(day.day);
              setProfile(day.transportMode || "walking");
              setMessage("");
            }}
            className={`rounded-full px-3 py-2 text-xs font-semibold shadow-sm ${
              selectedDay === day.day
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Day {day.day}
          </button>
        ))}
      </div>

      {activeDay && (
        <div className="absolute bottom-4 left-4 right-4 z-10 rounded-2xl bg-white/95 p-3 shadow-xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Day {activeDay.day} · {activeDay.city}
              </p>
              <p className="text-xs text-slate-500">
                {routeSummary
                  ? `${formatDistance(routeSummary.distance)} · ${formatDuration(routeSummary.duration)}`
                  : `${visibleStops.length} mapped stop${visibleStops.length === 1 ? "" : "s"}`}
              </p>
              {profile !== "driving" && (
                <p className="mt-1 text-[10px] text-slate-400">
                  Walking and cycling routes may not always include complete paths.
                </p>
              )}
            </div>
            <div className="flex rounded-xl bg-slate-100 p-1">
              {[
                ["walking", Footprints],
                ["cycling", Bike],
                ["driving", Car],
              ].map(([value, Icon]) => (
                <button
                  key={value}
                  onClick={() => {
                    setProfile(value);
                    setMessage("");
                  }}
                  aria-label={`Route by ${value}`}
                  title={`Route by ${value}`}
                  className={`rounded-lg p-2 ${
                    profile === value
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {(!mapReady || stopsLoading) && !message && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-slate-50/80">
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-slate-600 shadow">
            <LoaderCircle className="animate-spin" size={17} />
            Locating your stops…
          </div>
        </div>
      )}

      {message && (!mapReady || !mappedDays.length) && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-slate-50/90 p-6">
          <div className="max-w-sm text-center">
            <Route className="mx-auto mb-3 text-slate-400" size={38} />
            <p className="font-semibold text-slate-800">Map unavailable</p>
            <p className="mt-1 text-sm text-slate-500">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
