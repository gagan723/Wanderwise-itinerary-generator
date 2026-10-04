"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import ItineraryWorkspace from "@/components/ItineraryWorkspace";

export default function SavedTripPage({ params }) {
  const { id } = use(params);
  const [trip, setTrip] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [editingBusy, setEditingBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState(""), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    fetch(`/api/trips/${id}`, { signal: controller.signal, cache: "no-store" }).then(async (response) => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to open trip.");
      setTrip(data.trip); setDirty(false);
    }).catch((problem) => { if (!controller.signal.aborted) setError(problem.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, attempt]);
  useEffect(() => {
    const warn = (event) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function update(body) {
    if (busy || editingBusy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/trips/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to update trip.");
      // Preserve transient mapping evidence in this open session after a save.
      setTrip((current) => ({ ...data.trip, itinerary: body.itinerary ? { ...data.trip.itinerary, mapData: current.itinerary.mapData } : current.itinerary }));
      if (body.itinerary) { setDirty(false); toast.success("Changes saved"); }
      if (data.shareToken) { setShareUrl(`${window.location.origin}/shared/${data.shareToken}`); toast.success("Read-only sharing enabled"); }
      if (body.sharing === false) { setShareUrl(""); toast.success("Sharing revoked"); }
    } catch (problem) { toast.error(problem.message); }
    finally { setBusy(false); }
  }
  if (loading) return <p role="status" className="p-12 text-center">Opening your trip…</p>;
  if (error) return <div className="grid min-h-[70vh] place-items-center p-8 text-center"><div><h1 className="text-2xl font-bold">Trip unavailable</h1><p role="alert" className="mt-2">{error}</p><button onClick={() => setAttempt((value) => value + 1)} className="mt-4 rounded-lg border px-4 py-2">Retry</button><Link href="/trips" className="ml-4 text-blue-700">My Trips</Link></div></div>;
  return <div className="flex min-h-screen flex-col bg-slate-50 lg:h-screen">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-5 py-3">
      <Link href="/trips" onClick={(event) => { if (dirty && !window.confirm("Leave without saving your changes?")) event.preventDefault(); }} className="text-sm font-semibold text-blue-700">← My Trips</Link>
      <div><h1 className="font-bold">{trip.name}</h1><p className="text-xs text-slate-500">{dirty ? "Unsaved changes" : "Saved itinerary"} · {trip.sharingEnabled ? "Link sharing enabled" : "Private"}</p></div>
      <div className="flex flex-wrap gap-2"><button disabled={!dirty || busy || editingBusy} onClick={() => update({ itinerary: trip.itinerary })} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Saving…" : "Save changes"}</button>
        <button disabled={dirty || busy || editingBusy} onClick={() => update({ sharing: true })} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40">{trip.sharingEnabled ? "Replace share link" : "Enable sharing"}</button>
        {trip.sharingEnabled && <button disabled={busy || editingBusy} onClick={() => update({ sharing: false })} className="rounded-lg border px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-40">Revoke sharing</button>}
      </div>
    </header>
    <div className="border-b bg-white px-5 py-2 text-xs text-slate-600">Sharing lets anyone with the link view your saved itinerary. Save edits before sharing. Replacing a link disables the previous one.</div>
    {shareUrl && <div className="flex flex-wrap gap-2 border-b bg-blue-50 p-3"><input aria-label="Read-only share link" readOnly value={shareUrl} onFocus={(event) => event.target.select()} className="min-w-0 flex-1 rounded border bg-white p-2 text-sm" /><button onClick={async () => { try { await navigator.clipboard.writeText(shareUrl); toast.success("Link copied"); } catch { toast.error("Select the link and copy it manually."); } }} className="rounded border bg-white px-3 text-sm font-semibold">Copy link</button><a href={shareUrl} target="_blank" rel="noreferrer" className="p-2 text-sm text-blue-700">Open shared trip</a></div>}
    <main className="min-h-[42rem] flex-1 lg:min-h-0"><ItineraryWorkspace itinerary={trip.itinerary} disabled={busy} onBusyChange={setEditingBusy} onChange={(itinerary) => { setTrip((current) => ({ ...current, itinerary })); setDirty(true); }} /></main>
  </div>;
}
