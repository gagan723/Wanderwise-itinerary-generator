# 🌍 WanderWise – AI-Powered Travel Itinerary Generator

WanderWise is a full-stack web application that generates personalized travel itineraries using Google's Gemini AI. Users can input travel details like destination, dates, preferences, and budget, and instantly receive structured, day-by-day plans with recommendations on attractions, accommodations, and more.

> ✨ Built with Next.js 13 (App Router), Google Gemini API, and MongoDB.

---

## 🚀 Features

- 🔮 **AI-Generated Itineraries**: Personalized day-wise travel plans using Gemini.
- 💬 **Interactive Chat**: Smart Q&A to refine your trip details.
- 👤 **Authentication**: Google login and email/password with NextAuth.js.

---

## 🛠️ Tech Stack

| Tech               | Description                               |
|--------------------|-------------------------------------------|
| **Next.js 13**      | App Router, SSR, API Routes               |
| **Tailwind CSS**    | Modern utility-first styling              |
| **MongoDB**         | Itinerary and user data storage           |
| **NextAuth.js**     | Authentication (Google + Email/Password) |
| **Gemini API**      | AI itinerary generation                  |
| **Vercel**          | Deployment                                |


✨ Features
Interactive Chat Interface: A user-friendly chat window to communicate your travel desires.

AI-Powered Information Gathering: Intelligently extracts critical trip details (destination, dates, travelers) from your natural language input.

Contextual Understanding: Remembers previous conversation turns to build a comprehensive understanding of your trip requirements.

Dynamic Itinerary Generation: Once all necessary details are collected, Gemini AI generates a structured, day-by-day itinerary.

Multi-City Support: Capable of generating itineraries that span multiple cities within a single trip.

Responsive Design: Optimized for a seamless experience on both desktop and mobile devices.

Detailed Itinerary View: Presents accommodations, attractions, and daily descriptions in a clear, organized timeline.

🚀 Technologies Used
Frontend:

Next.js (React Framework)

React

Tailwind CSS for styling

Lucide React for icons

Backend:

Next.js API Routes (App Router)

Google Generative AI SDK for JavaScript

Google Gemini API (models: gemini-2.5-flash, gemini-2.5-pro)

Deployment:

Vercel

⚙️ Setup and Local Development
Follow these steps to get WanderWise running on your local machine.

Prerequisites
Node.js (v18 or higher recommended)

npm or Yarn

A Google Cloud Project with the Gemini API enabled.

A Google Generative AI API Key.

1. Clone the Repository
git clone https://github.com/your-username/wanderwise.git # Replace with your repo URL
cd wanderwise

2. Install Dependencies
npm install
# or
yarn install

3. Configure Environment Variables
Create a .env.local file in the root of your project and add your Gemini API Key:

GEMINI_API_KEY=YOUR_GOOGLE_GEMINI_API_KEY

Important Note on API Key Restrictions:
For local development, your API key might be restricted to http://localhost:3000/* (or your local development port). When deploying to Vercel, you will need to adjust your API key restrictions in the Google Cloud Console. For server-side calls (like your Next.js API route making calls to Gemini), you typically need to enable "Allow requests from no referrer" in your API key's application restrictions, as server-side requests often don't send a Referer header.

4. Run the Development Server
npm run dev
# or
yarn dev

Open http://localhost:3000 (or the port indicated in your terminal) in your browser to see the application.

🚀 Deployment
WanderWise is designed for easy deployment to Vercel.

Create a Vercel Project: Connect your GitHub repository to Vercel.

Configure Environment Variables: In your Vercel project settings, go to "Environment Variables" and add GEMINI_API_KEY with your Google Gemini API Key.

Adjust API Key Restrictions (Crucial for Vercel):

Go to your Google Cloud Console (APIs & Services -> Credentials).

Edit the API key used for GEMINI_API_KEY.

Under "Application restrictions", ensure "None" is selected. This allows server-side requests (from your Vercel functions) to the Gemini API, as they do not send a referrer.

Alternatively, if you must use HTTP referrers, you would need to enable "Allow requests from no referrer" within the "HTTP referrers (web sites)" section.

Deploy: Vercel will automatically build and deploy your application.

💡 Usage
Start Chatting: Begin by typing your travel preferences into the chat input. For example:

"Plan a solo adventure trip to Bali in August 2025, mid-range budget."

"I want to visit Kyoto, Japan with 2 adults for 5 days in April 2026, interested in culture and food."

Provide Details: The AI assistant will ask clarifying questions if it needs more information (e.g., specific dates, number of travelers).

Itinerary Generation: Once all critical details are gathered, the assistant will indicate "Ready to generate itinerary!" and then proceed to generate a detailed plan.

View Itinerary: The generated itinerary will appear in the right-hand panel, organized by day, showing accommodations, attractions, and a detailed description for each day.

