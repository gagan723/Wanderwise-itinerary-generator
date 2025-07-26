"use client"
import React, { useState } from 'react';
import { Send, MapPin, Calendar, Users, DollarSign, Plane, Hotel } from 'lucide-react';


// ChatInput Component (No changes needed here)
const ChatInput = ({ onSendMessage, isLoading }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2 p-4 bg-white border-t">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Tell me about your dream trip..."
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={isLoading}
      />
      <button
        onClick={handleSubmit}
        disabled={!message.trim() || isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <Send size={16} />
        {isLoading ? 'Sending...' : 'Send'}
      </button>
    </div>
  );
};

// ChatMessages Component 
const ChatMessages = ({ messages, isLoading }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && (
        <div className="text-center text-gray-500 mt-12">
          <div className="mb-4">
            <Plane size={48} className="mx-auto text-gray-300" />
          </div>
          <h3 className="text-lg font-medium mb-2">Start Planning Your Trip</h3>
          <div>
            <p>🧳 Let’s craft an unforgettable journey. Please share the following details: destination, travel dates, number of travelers, travel style, and budget.</p>
          </div>
        </div>
      )}

      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-lg px-4 py-2 ${
              message.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
            <div className="text-xs opacity-70 mt-1">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-[80%]">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-teal-600 border-t-transparent"></div>
              <span className="text-gray-600">Planning your trip...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ItineraryCard Component (No changes needed here)
const ItineraryCard = ({ day, isLast }) => {
  if (!day) return null;

  return (
    <div className={`relative ${!isLast ? 'pb-8' : ''}`}>
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-6 top-16 w-0.5 h-full bg-gradient-to-b from-blue-300 to-gray-200"></div>
      )}

      <div className="flex items-start gap-4">
        {/* Day number circle */}
        <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm z-10">
          {day.day}
        </div>

        {/* Day content */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Calendar size={14} />
              {day.date}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{day.title}</h3>
          </div>

          <p className="text-gray-700 mb-4 leading-relaxed">{day.description}</p>

          {/* Accommodations */}
          {day.accommodations && day.accommodations.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-1">
                <Hotel size={14} />
                Accommodation
              </div>
              <div className="flex flex-wrap gap-1">
                {day.accommodations.map((acc, idx) => (
                  <span key={idx} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    {acc}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Attractions */}
          {day.attractions && day.attractions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
                <MapPin size={14} />
                Attractions
              </div>
              <div className="flex flex-wrap gap-1">
                {day.attractions.map((attraction, idx) => (
                  <span key={idx} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {attraction}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ItineraryLayout Component - MODIFIED TO DISPLAY ALL DAYS
const ItineraryLayout = ({ itinerary }) => {
  if (!itinerary) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <MapPin size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">No Itinerary Yet</h3>
          <p>Start chatting to generate your personalized travel itinerary!</p>
        </div>
      </div>
    );
  }

  // Flatten all itinerary days from all locations into a single array, sorted by day number
  const allDays = itinerary.locations.flatMap(location => location.itinerary)
    .sort((a, b) => a.day - b.day);

  // Determine the primary city for the header (e.g., the first city, or just "Multiple Locations")
  const primaryCity = itinerary.locations.length > 0
    ? itinerary.locations[0].city + (itinerary.locations.length > 1 ? " & more" : "")
    : "Unknown Location";


  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 sticky top-0 z-10">
        <h1 className="text-2xl font-bold mb-2">{itinerary.title}</h1>
        <div className="flex items-center gap-4 text-blue-100">
          <div className="flex items-center gap-1">
            <Calendar size={16} />
            {itinerary.dates}
          </div>
          <div className="flex items-center gap-1">
            <MapPin size={16} />
            {primaryCity} {/* Display the primary city or "Multiple Locations" */}
          </div>
        </div>
      </div>

      {/* Itinerary Timeline */}
      <div className="p-6">
        <div className="space-y-0">
          {allDays.map((day, index) => (
            <ItineraryCard
              key={day.day} // Use day.day as key, assuming it's unique and sequential
              day={day}
              isLast={index === allDays.length - 1} // Calculate isLast based on the flattened array
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Main Page Component (No changes needed here, as the ItineraryLayout handles the display)
const TripPlannerPage = () => {
  const [messages, setMessages] = useState([]);
  const [itinerary, setItinerary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationContext, setConversationContext] = useState({});

  const handleSendMessage = async (message) => {
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // --- Step 1: Send message for info gathering ---
      const infoResponse = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: message,
          type: 'info', // Always send 'info' type for the initial chat message
          context: conversationContext // Pass the accumulated context
        })
      });

      const infoData = await infoResponse.json(); // This is the response from the 'info' model

      // Update the conversation context with the latest collected details
      if (infoData.collected_details && typeof infoData.collected_details === 'object') {
          setConversationContext(infoData.collected_details);
      }

      // Display the AI's status message (e.g., asking for more info or "Ready...")
      const assistantMessage = {
        role: 'assistant',
        content: infoData.status_message, // Display the message from the info model
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // --- Step 2: Check if ready to generate itinerary and make a *second* API call ---
      if (infoData.status_message === "Ready to generate itinerary!") {
        setIsLoading(true); // Trigger loading state again for the itinerary generation

        const itineraryResponse = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: "Generate the itinerary now.", // A simple trigger message for the itinerary model
            type: 'itinerary', // This explicitly tells the backend to generate itinerary
            context: infoData.collected_details // Pass the *complete* collected details
          })
        });

        const itineraryData = await itineraryResponse.json(); // This is the full itinerary JSON

        setItinerary(itineraryData); // Set the itinerary
      }

    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Chat Panel */}
      <div className="w-1/2 flex flex-col bg-white border-r border-gray-200">
        <div className="bg-white border-b border-gray-200 p-4">
          <h2 className="text-xl font-semibold text-gray-900">Trip Planning Assistant</h2>
          <p className="text-sm text-gray-600">Let's plan your perfect trip together!</p>
        </div>

        <ChatMessages messages={messages} isLoading={isLoading} />
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>

      {/* Itinerary Panel */}
      <div className="w-1/2 bg-gray-50">
        <ItineraryLayout itinerary={itinerary} />
      </div>
    </div>
  );
};

export default TripPlannerPage;
