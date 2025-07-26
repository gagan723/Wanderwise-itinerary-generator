// app/api/gemini/route.js

import { askGemini } from '@/lib/gemini'; // Adjust this path if necessary based on your folder structure

export async function POST(request) {
  try {
    const { userMessage, type, context } = await request.json();

    if (!userMessage || !type) {
      return new Response(JSON.stringify({ error: 'Missing userMessage or type in request body.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (type === 'info') {
      // Handle information gathering
      const infoResponse = await askGemini({ userMessage, type: 'info', context: context });

      // The infoResponse directly contains:
      // {
      //   status_message: "Ready to generate itinerary!" or "What's your destination?",
      //   collected_details: { ... }, // This is the context you want the frontend to store
      //   missing_fields: [...]
      // }
      
      // Send back the info model's response directly
      return new Response(JSON.stringify(infoResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } else if (type === 'itinerary') {
      // Handle itinerary generation
      // The frontend should have sent the complete 'context' for itinerary generation
      if (!context || Object.keys(context).length === 0) {
          return new Response(JSON.stringify({ error: 'Context is required for itinerary generation.' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
          });
      }

      const itineraryResult = await askGemini({
        userMessage: userMessage, // Can be a generic trigger like "Generate the itinerary"
        type: 'itinerary',
        context: context // Pass the full collected context received from the frontend
      });

      // The itineraryResult should be the full JSON itinerary object directly from askGemini
      return new Response(JSON.stringify(itineraryResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ error: 'Invalid type specified.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('API Route Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}