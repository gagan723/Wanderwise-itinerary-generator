// lib/gemini.js (Updated askGemini function)

import { GoogleGenerativeAI } from "@google/generative-ai";

// desired JSON itinerary schema (already present, keep as is)
const itinerarySchema = {
    type: "object",
    properties: {
        title: {
            type: "string",
            description:
                "Overall title of the trip, e.g., '10-Day Vietnam Cultural and Nature Adventure'",
        },
        dates: {
            type: "string",
            description:
                "Overall date range of the trip, e.g., '22 May - 1 Jun'",
        },
        locations: {
            type: "array",
            description: "List of cities/locations visited on the trip.",
            items: {
                type: "object",
                properties: {
                    city: {
                        type: "string",
                        description: "Name of the city, e.g., 'Hanoi'",
                    },
                    days: {
                        type: "array",
                        items: { type: "integer" },
                        description:
                            "An array of day numbers spent in this city, e.g., [1, 2, 3, 4]",
                    },
                    itinerary: {
                        type: "array",
                        description:
                            "Detailed itinerary for each day in this city.",
                        items: {
                            type: "object",
                            properties: {
                                day: {
                                    type: "integer",
                                    description:
                                        "The number of the day in the overall trip, e.g., 1",
                                },
                                title: {
                                    type: "string",
                                    description:
                                        "Title for the day's activities, e.g., 'Arrival and Old Quarter Exploration'",
                                },
                                date: {
                                    type: "string",
                                    description:
                                        "Specific date for this day, e.g., '22 May, 2025'",
                                },
                                description: {
                                    type: "string",
                                    description:
                                        "A brief paragraph summarizing the day's activities, including key details like check-in, main activities, and meals if relevant.",
                                },
                                accommodations: {
                                    type: "array",
                                    items: { type: "string" },
                                    description:
                                        "List of accommodation names for the day.",
                                },
                                attractions: {
                                    type: "array",
                                    items: { type: "string" },
                                    description:
                                        "List of main attraction names for the day.",
                                },
                            },
                            required: ["day", "title", "date", "description"],
                        },
                    },
                },
                required: ["city", "days", "itinerary"],
            },
        },
    },
    required: ["title", "dates", "locations"],
};

// Modified schema for information gathering
const infoSchema = {
    type: "object",
    properties: {
        status_message: {
            type: "string",
            description: "A natural language message for the user, either asking for more details or confirming readiness.",
        },
        collected_details: {
            type: "object",
            description: "A JSON object containing the extracted and merged trip details. Null for fields means not identified yet.",
            properties: {
                destination: { type: "string", nullable: true, description: "City, Country (e.g., 'Bali, Indonesia')" },
                startDate: { type: "string", nullable: true, description: "Start date of the trip (YYYY-MM-DD)" },
                endDate: { type: "string", nullable: true, description: "End date of the trip (YYYY-MM-DD)" },
                travelers: { type: "string", nullable: true, description: "Number of people and type (e.g., '2 adults', 'solo trip', 'family with 2 children (ages 8, 12)')" },
                budget: { type: "string", nullable: true, description: "Budget level" },
                accommodationType: { type: "string", nullable: true, description: "Preferred accommodation type (e.g., 'mid-range hotels', 'hostels', 'luxury resorts')" },
                specificRequests: { type: "string", nullable: true, description: "Any other specific requests (e.g., 'include a cooking class')" }
            }
        },
        missing_fields: {
            type: "array",
            items: { type: "string" },
            description: "A list of fields that are still missing and are critical for itinerary generation (e.g., ['destination', 'startDate', 'travelers']). If all essential fields are identified, this array should be empty.",
        }
    },
    required: ["status_message", "collected_details", "missing_fields"]
};


export async function askGemini({ userMessage, type = "info", context = {} }) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY, {
        apiVersion: "v1",
    });

    let model;
    let prompt = "";
    let generationConfig = {};

    if (type === "info") {
        model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });
        generationConfig = {
            responseMimeType: "application/json",
            responseSchema: infoSchema,
        };
        prompt = `
You are an intelligent travel assistant. Your goal is to extract all necessary trip details from the user's messages.
You must always output a JSON object containing the current status message for the user, all identified trip details, and a list of any *critical* missing fields.

**Critical Trip Details for Itinerary Generation:**
-   **Destination(s):** City, Country (e.g., "Bali, Indonesia")
-   **Travel Dates:** Specific start and end date (YYYY-MM-DD). If user says "5 days next month", try to infer or ask for specific dates. If only duration is given, clearly state it's missing specific dates.
-   **Number of people:** Specific numbers for adults and children (with ages if children are present). E.g., "solo trip", "2 adults", "family with 2 children (ages 8, 12)".

**Optional Trip Details (extract if provided, but not critical to start itinerary generation):**
-   **Budget:** (economy, mid-range, luxury) - Assume 'mid-range' if not specified.
-   **Accommodation type:** (e.g., mid-range hotels, hostels, luxury resorts, boutique stays) - Assume 'mid-range hotels' if not specified.
-   **Specific Requests:** Any other unique preferences.

**Current Known Trip Details (from previous conversation turns, merge with new info):**
${JSON.stringify(context, null, 2)}

**User's Current Message:** "${userMessage}"

**Instructions for your response:**
1.  **Extract and merge:** Combine details from 'Current Known Trip Details' with new information from 'User's Current Message'. New information overrides old.
2.  **Infer defaults:** Apply assumptions for 'Budget', and 'Accommodation type' if they are missing from both current and new input.
3.  **Determine missing_fields:** Identify any of the **Critical Trip Details** that are still missing (i.e., null or empty after merging and inferring).
4.  **Formulate status_message:**
    * If 'missing_fields' is NOT empty: Politely ask the user to provide the specific missing information. Guide them on the format.
    * If 'missing_fields' IS empty: State "Ready to generate itinerary!"
5.  **Output ONLY JSON** according to the 'infoSchema'. Do not add any conversational text outside the JSON.
`;

    } else if (type === "itinerary") {
        model = genAI.getGenerativeModel({ model: "models/gemini-2.5-pro" });
        generationConfig = {
            responseMimeType: "application/json",
            responseSchema: itinerarySchema,
        };
        prompt = `
You are a travel assistant that generates high-level, structured, day-by-day travel itineraries.

Based on the following confirmed trip details, generate a structured itinerary for the mentioned dates.
For each day, list the main accommodation and attractions. Include all relevant details within the main description paragraph.
Ensure the itinerary covers **every single day** from the start date to the end date, matching the total duration provided.

**Confirmed Trip Details:**
${JSON.stringify(context, null, 2)}

Return only the JSON itinerary.
`;
    } else {
        throw new Error("Invalid 'type' provided to askGemini.");
    }

    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: generationConfig,
        });
        const response = await result.response;

        const jsonString = await response.text();
        try {
            const parsedResponse = JSON.parse(jsonString);
            return parsedResponse;
        } catch (parseError) {
            console.error("Failed to parse Gemini JSON response:", parseError);
            console.error("Raw response:", jsonString);
            throw new Error(`Gemini returned invalid JSON for type '${type}': ${jsonString.substring(0, 200)}...`);
        }
    } catch (error) {
        console.error("Gemini API error:", error);
        throw error;
    }
}