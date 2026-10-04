"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import ItineraryWorkspace from "@/components/ItineraryWorkspace";

export default function SharedTripPage({ params }) {
  const { token } = use(params);
  const [trip, setTrip] = useState(null), [error, setError] = useState(""), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setError(""); setTrip(null);
    fetch(`/api/shared/${token}`, { signal: controller.signal, cache: "no-store" }).then(async (response) => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Shared trip unavailable.");
      setTrip(data.trip);
    }).catch((problem) => { if (!controller.signal.aborted) setError(problem.message); });
    return () => controller.abort();
  }, [token, attempt]);
  if (error) return <div className="grid min-h-[70vh] place-items-center p-8 text-center"><div><h1 className="text-2xl font-bold">Shared trip unavailable</h1><p role="alert" className="mt-2">{error}</p><button onClick={() => setAttempt((value) => value + 1)} className="mt-4 rounded-lg border px-4 py-2">Retry</button><Link href="/" className="ml-4 text-blue-700">WanderWise home</Link></div></div>;
  if (!trip) return <p role="status" className="p-12 text-center">Opening shared trip…</p>;
  return <div className="flex min-h-screen flex-col bg-slate-50 lg:h-screen"><header className="border-b bg-white p-4"><Link href="/" className="text-sm font-semibold text-blue-700">WanderWise</Link><h1 className="font-bold">{trip.name}</h1><p className="text-xs text-slate-500">Shared itinerary · Read only</p></header><main className="min-h-[42rem] flex-1 lg:min-h-0"><ItineraryWorkspace itinerary={trip.itinerary} shareToken={token} /></main></div>;
}
