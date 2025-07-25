import {GoogleGenerativeAI} from "@google/generative-ai"; 

// desired JSON itinerary schema 
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

export async function askGemini({ userMessage, type = "info", context = {} }) {
	const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY, {
		apiVersion: "v1",
	});

	let model;
	let prompt = "";
	let generationConfig = {};

	if (type === "info") {
		model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" }); 
		prompt = `
      You are a helpful travel assistant.

      The user said: "${userMessage}"

      Your task is to identify missing trip details from the following:
      - Destination(s)
      - Travel dates or duration
      - Number of people
      - Budget
      - Travel style (adventure, culture, food, etc.)
      - Accommodation type 

	  If accomodation is not specified assume it to be mid-range hotels.
	  If travel style is not mentioned assume it to be adventure,culture and food.
      Ask follow-up questions only about what's missing and tell them to enter the message again with all the details,
      If all necessary details are present, reply with: "Ready to generate itinerary.", followed by all the mentioned details about Destination(s)
      ,Travel dates or duration, Number of people, Budget, Travel style and any other details specified.
`;

	} else if (type === "itinerary") {
    model = genAI.getGenerativeModel({ model: "models/gemini-2.5-pro" }); // Use Pro for better results
    prompt = `
        You are a travel assistant that generates high-level, structured, day-by-day travel itineraries.

        Based on the following trip details, generate a structured itinerary for the mentioned dates.
        For each day, list the main accommodation and attractions. Include all relevant details within the main description paragraph.

        Trip Details:
        ${JSON.stringify(context, null, 2)}

        Ensure the itinerary covers **every single day** from the start date to the end date, matching the total duration provided.
        Return only the JSON itinerary.
    `;
    generationConfig = {
        responseMimeType: "application/json",
        responseSchema: itinerarySchema,
    };
} else {
		throw new Error("Invalid 'type' provided to askGemini.");
	}

	try {
		const result = await model.generateContent({
			contents: [{ role: "user", parts: [{ text: prompt }] }],
			generationConfig: generationConfig,
		});
		const response = await result.response;

		if (type === "itinerary") {
			const jsonString = await response.text();
			return JSON.parse(jsonString); 
		} else {
			// For info type, return as plain text
			return response.text();
		}
		// --- END CRITICAL CHANGE ---
	} catch (error) {
		console.error("Gemini error:", error);
		// Might want to return an error object that can be JSON parsed
		// example: throw new Error(JSON.stringify({ message: "Gemini API error", details: error.message }));
		throw error;
	}
}
