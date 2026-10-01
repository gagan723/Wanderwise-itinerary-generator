"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Plane, Save, Send } from "lucide-react";
import toast from "react-hot-toast";
import ItineraryWorkspace from "@/components/ItineraryWorkspace";

function ChatInput({ onSendMessage, isLoading }) {
  const [message, setMessage] = useState("");
  const submit = () => {
    if (!message.trim() || isLoading) return;
    onSendMessage(message.trim());
    setMessage("");
  };

  return (
    <div className="flex gap-2 border-t bg-white p-4">
      <input
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        placeholder="Tell me about your dream trip..."
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
        disabled={isLoading}
      />
      <button onClick={submit} disabled={!message.trim() || isLoading} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
        <Send size={16} /> {isLoading ? "Sending..." : "Send"}
      </button>
    </div>
  );
}

function ChatMessages({ messages, isLoading }) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {!messages.length && (
        <div className="mt-12 text-center text-gray-500">
          <Plane size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="mb-2 text-lg font-medium">Start Planning Your Trip</h3>
          <p>Let&apos;s craft an unforgettable journey. Share your destination, travel dates, number of travelers, travel style, and budget.</p>
        </div>
      )}
      {messages.map((message, index) => (
        <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"}`}>
            <p className="whitespace-pre-wrap">{message.content}</p>
            <div className="mt-1 text-xs opacity-70">{new Date(message.timestamp).toLocaleTimeString()}</div>
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
            Planning your trip...
          </div>
        </div>
      )}
    </div>
  );
}

export default function TripPlannerPage() {
  const [messages, setMessages] = useState([]);
  const [itinerary, setItinerary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedTripId, setSavedTripId] = useState(null);
  const [conversationContext, setConversationContext] = useState({});

  const handleSendMessage = async (message) => {
    setMessages((current) => [...current, { role: "user", content: message, timestamp: new Date().toISOString() }]);
    setIsLoading(true);
    try {
      const infoResponse = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: message, type: "info", context: conversationContext }),
      });
      const infoData = await infoResponse.json();
      if (!infoResponse.ok) throw new Error(infoData.error || "Unable to plan trip.");

      if (infoData.collected_details && typeof infoData.collected_details === "object") {
        setConversationContext(infoData.collected_details);
      }
      setMessages((current) => [...current, {
        role: "assistant",
        content: infoData.status_message,
        timestamp: new Date().toISOString(),
      }]);

      if (infoData.status_message === "Ready to generate itinerary!") {
        const itineraryResponse = await fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userMessage: "Generate the itinerary now.", type: "itinerary", context: infoData.collected_details }),
        });
        const itineraryData = await itineraryResponse.json();
        if (!itineraryResponse.ok) throw new Error(itineraryData.error || "Unable to generate itinerary.");
        setItinerary(itineraryData);
        setSavedTripId(null);
      }
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: error.message || "Sorry, I encountered an error. Please try again.", timestamp: new Date().toISOString() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTrip = async () => {
    if (!itinerary || isSaving || savedTripId) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerary }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save trip.");
      setSavedTripId(data.trip._id);
      toast.success("Trip saved to My Trips");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 lg:h-screen lg:flex-row">
      <div className="flex min-h-[48rem] flex-col border-r border-gray-200 bg-white lg:min-h-0 lg:w-1/2">
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white p-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Trip Planning Assistant</h2>
            <p className="text-sm text-gray-600">Let&apos;s plan your perfect trip together!</p>
          </div>
          <Link href="/trips" className="whitespace-nowrap text-sm font-semibold text-blue-600 hover:text-blue-800">My Trips</Link>
        </div>
        <ChatMessages messages={messages} isLoading={isLoading} />
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>

      <div className="flex min-h-[42rem] flex-col bg-gray-50 lg:min-h-0 lg:w-1/2">
        {itinerary && (
          <div className="flex justify-end border-b bg-white px-4 py-2">
            {savedTripId ? (
              <Link href={`/trips/${savedTripId}`} className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100">
                <Check size={16} /> Saved - View trip
              </Link>
            ) : (
              <button onClick={saveTrip} disabled={isSaving} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                <Save size={16} /> {isSaving ? "Saving..." : "Save Trip"}
              </button>
            )}
          </div>
        )}
        <div className="min-h-0 flex-1"><ItineraryWorkspace itinerary={itinerary} /></div>
      </div>
    </div>
  );
}
