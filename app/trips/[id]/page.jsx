"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, MapPin } from "lucide-react";
import ItineraryWorkspace from "@/components/ItineraryWorkspace";

export default function SavedTripPage({ params }) {
  const { id } = use(params);
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/trips/${id}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(response.status === 404 ? "This trip was not found or is no longer available." : data.error || "Unable to load trip.");
        if (active) setTrip(data.trip);
      })
      .catch((fetchError) => active && setError(fetchError.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-500"><div className="text-center"><LoaderCircle className="mx-auto mb-3 animate-spin" /><p>Opening your trip...</p></div></div>;
  if (error) return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center">
      <div><MapPin className="mx-auto mb-4 text-slate-300" size={48} /><h1 className="text-2xl font-bold text-slate-900">Trip unavailable</h1><p className="mt-2 text-slate-600">{error}</p><Link href="/trips" className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white">Back to My Trips</Link></div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:h-screen">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-5 py-3 shadow-sm">
        <Link href="/trips" className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"><ArrowLeft size={17} /> My Trips</Link>
        <div className="min-w-0 text-right"><h1 className="truncate font-bold text-slate-900">{trip.name}</h1><p className="text-xs text-slate-500">Saved itinerary</p></div>
      </header>
      <main className="min-h-[42rem] flex-1"><ItineraryWorkspace itinerary={trip.itinerary} /></main>
    </div>
  );
}
