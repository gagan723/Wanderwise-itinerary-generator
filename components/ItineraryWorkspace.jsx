"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { List, Map as MapIcon } from "lucide-react";
import ItineraryLayout from "@/components/ItineraryLayout";

const ItineraryMap = dynamic(() => import("@/components/map/ItineraryMap"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-gray-500">Opening your map...</div>,
});

export default function ItineraryWorkspace({ itinerary }) {
  const [view, setView] = useState("itinerary");

  return (
    <div className="flex h-full min-h-0 flex-col">
      {itinerary && (
        <div className="flex items-center gap-1 border-b border-gray-200 bg-white p-2">
          {[["itinerary", List, "Itinerary"], ["map", MapIcon, "Map & routes"]].map(([value, Icon, label]) => (
            <button
              key={value}
              onClick={() => setView(value)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                view === value ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1">
        {view === "map" && itinerary ? <ItineraryMap itinerary={itinerary} /> : <ItineraryLayout itinerary={itinerary} />}
      </div>
    </div>
  );
}
