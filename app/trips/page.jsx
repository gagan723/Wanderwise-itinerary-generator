"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Edit3, LoaderCircle, MapPin, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

function destinations(trip) {
  const cities = trip.itinerary?.locations?.map((location) => location.city).filter(Boolean) || [];
  return cities.length ? cities.join(", ") : "Destination unavailable";
}

export default function MyTripsPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    fetch("/api/trips")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load trips.");
        if (active) setTrips(data.trips || []);
      })
      .catch((fetchError) => active && setError(fetchError.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [attempt]);

  const renameTrip = async (trip) => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 100) {
      toast.error("Trip name must be between 1 and 100 characters.");
      return;
    }
    setBusyId(trip._id);
    try {
      const response = await fetch(`/api/trips/${trip._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to rename trip.");
      setTrips((current) => current.map((item) => item._id === trip._id ? { ...item, name: data.trip.name, updatedAt: data.trip.updatedAt } : item));
      setEditingId(null);
      toast.success("Trip renamed");
    } catch (renameError) {
      toast.error(renameError.message);
    } finally {
      setBusyId(null);
    }
  };

  const deleteTrip = async (trip) => {
    if (!window.confirm(`Delete “${trip.name}”? This cannot be undone.`)) return;
    setBusyId(trip._id);
    try {
      const response = await fetch(`/api/trips/${trip._id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete trip.");
      setTrips((current) => current.filter((item) => item._id !== trip._id));
      toast.success("Trip deleted");
    } catch (deleteError) {
      toast.error(deleteError.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/" className="text-sm font-semibold text-teal-700 hover:text-teal-900">WanderWise</Link>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">My Trips</h1>
            <p className="mt-2 text-slate-600">Your saved itineraries, ready whenever you are.</p>
          </div>
          <Link href="/trip" className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-700">
            <Plus size={18} /> Plan a new trip
          </Link>
        </div>

        {loading && <div className="grid place-items-center py-24 text-slate-500"><LoaderCircle className="mb-3 animate-spin" /><p>Loading your trips...</p></div>}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
            <p className="font-semibold">We couldn&apos;t load your trips.</p><p className="mt-1 text-sm">{error}</p>
            <button onClick={() => setAttempt((value) => value + 1)} className="mt-4 rounded-lg border border-red-300 px-4 py-2 font-semibold">Retry</button>
          </div>
        )}
        {!loading && !error && !trips.length && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
            <MapPin className="mx-auto mb-4 text-slate-300" size={48} />
            <h2 className="text-xl font-semibold text-slate-900">No saved trips yet</h2>
            <p className="mx-auto mt-2 max-w-md text-slate-500">Generate an itinerary and choose Save Trip to keep it here.</p>
            <Link href="/trip" className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">Plan your first trip</Link>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <article key={trip._id} className="flex min-h-64 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              {editingId === trip._id ? (
                <div className="mb-4">
                  <input autoFocus maxLength={100} value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && renameTrip(trip)} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-blue-500" />
                  <div className="mt-2 flex gap-2">
                    <button disabled={busyId === trip._id} onClick={() => renameTrip(trip)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">Save</button>
                    <button onClick={() => setEditingId(null)} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                  </div>
                </div>
              ) : <h2 className="mb-4 line-clamp-2 text-xl font-bold text-slate-900">{trip.name}</h2>}

              <div className="space-y-3 text-sm text-slate-600">
                <p className="flex items-start gap-2"><MapPin className="mt-0.5 shrink-0 text-blue-500" size={16} /><span>{destinations(trip)}</span></p>
                <p className="flex items-start gap-2"><Calendar className="mt-0.5 shrink-0 text-purple-500" size={16} /><span>{trip.itinerary?.dates || "Dates unavailable"}</span></p>
              </div>
              <p className="mt-4 text-xs text-slate-400">Updated {new Date(trip.updatedAt).toLocaleDateString()}</p>

              <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-5">
                <Link href={`/trips/${trip._id}`} className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-slate-700">View trip</Link>
                <button aria-label={`Rename ${trip.name}`} title="Rename" onClick={() => { setEditingId(trip._id); setName(trip.name); }} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"><Edit3 size={18} /></button>
                <button disabled={busyId === trip._id} aria-label={`Delete ${trip.name}`} title="Delete" onClick={() => deleteTrip(trip)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"><Trash2 size={18} /></button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
