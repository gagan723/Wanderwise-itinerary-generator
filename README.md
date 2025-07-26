# 🌍 WanderWise – AI-Powered Travel Itinerary Generator

WanderWise is a full-stack web application that generates personalized travel itineraries (Travel plan) using Google's Gemini AI. Users can input travel details like destination, dates, preferences, and budget, and instantly receive structured, day-by-day plans with recommendations on attractions, accommodations, and more.

> ✨ Built with Next.js 13 (App Router), Google Gemini API, and MongoDB.

---
## 🚀 Deployed link
- https://wanderwise-itinerary-generator.vercel.app


## 🛠️ Tech Stack

| Tech               | Description                               |
|--------------------|-------------------------------------------|
| **Next.js 13**      | App Router, SSR, API Routes               |
| **Tailwind CSS**    | Modern utility-first styling              |
| **MongoDB**         | Itinerary and user data storage           |
| **NextAuth.js**     | Authentication (Google + Email/Password) |
| **Gemini API**      | AI itinerary generation                  |
| **Vercel**          | Deployment                                |


### ✨ Features

- 💬 **Interactive Chat Interface**  
  A user-friendly chat window to communicate your travel desires.

- 🧠 **AI-Powered Information Gathering**  
  Intelligently extracts critical trip details (destination, dates, travelers) from your natural language input.

- 🧩 **Contextual Understanding**  
  Remembers previous conversation turns to build a comprehensive understanding of your trip requirements.

- 📅 **Dynamic Itinerary Generation**  
  Once all necessary details are collected, Gemini AI generates a structured, day-by-day itinerary.

- 🗺️ **Multi-City Support**  
  Capable of generating itineraries that span multiple cities within a single trip.

- 🖥️📱 **Responsive Design**  
  Optimized for a seamless experience on both desktop and mobile devices.

- 🗓️ **Detailed Itinerary View**  
  Presents accommodations, attractions, and daily descriptions in a clear, organized timeline.

---

⚙️ Setup and Local Development
Follow these steps to get WanderWise running on your local machine.

Prerequisites
Node.js (v18 or higher recommended)

npm or Yarn

A Google Cloud Project with the Gemini API enabled.

A Google Generative AI API Key.

### 1. Clone the Repository
 ```bash
git clone https://github.com/yourusername/wanderwise.git
cd wanderwise
```
### 2. Install Dependencies on both frontend and backend

 ```bash
  npm install

```
### 3. Create .env file in backend and add

 ```bash
NEXTAUTH_SECRET=your-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GEMINI_API_KEY=your-gemini-api-key
MONGO=your-mongodb-uri

```
### 4. Then run backend and frontend server

 ```bash
npm run dev

```
Open http://localhost:3000 (or the port indicated in your terminal) in your browser to see the application.

## Usage

Start Chatting: Begin by typing your travel preferences into the chat input. For example:

"Plan a solo adventure trip to Bali in August 2025, mid-range budget."

"I want to visit Kyoto, Japan with 2 adults for 5 days in April 2026, interested in culture and food."

Provide Details: The AI assistant will ask clarifying questions if it needs more information (e.g., specific dates, number of travelers).

Itinerary Generation: Once all critical details are gathered, the assistant will indicate "Ready to generate itinerary!" and then proceed to generate a detailed plan.

View Itinerary: The generated itinerary will appear in the right-hand panel, organized by day, showing accommodations, attractions, and a detailed description for each day.

