import Image from "next/image";
import React from "react";

const steps = [
  {
  id: 1,
  title: "Tell Us About Your Trip",
  description: 
    "Share your travel preferences, including dates, interests, budget, and destinations. Our AI analyzes your inputs to curate the perfect itinerary.",
  icon: "📝",
},
{
  id: 2,
  title: "Get Your Smart Itinerary",
  description: 
    "Receive a personalized travel plan with daily schedules, recommended activities, insider tips, and local insights. Whether you seek adventure or relaxation, we've got you.",
  icon: "🧠",
},
{
  id: 3,
  title: "Enjoy & Adapt on the Go",
  description: 
    "Access your itinerary offline, sync with your calendar, and make changes anytime. Whether plans shift or you find a hidden gem, our system keeps your journey smooth.",
  icon: "🌍",
}
];

const HowItWorks = () => {
  return (
    <section className="pt-20 md:px-16 bg-white animate-fadeInLeft" id="how-it-works">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-10">
        {/* Left Side - Steps */}
        <div className="flex-1 space-y-8 px-10">
          <h2 className="text-teal-700 text-sm font-semibold uppercase tracking-wide">
            How IT Works
          </h2>
          <h3 className="text-3xl md:text-5xl font-bold text-gray-800 leading-tight">
            Plan Your Trip in 3 Smart Steps
          </h3>

          <div className="space-y-6 mt-6">
            {steps.map((step) => (
              <div key={step.id} className="flex items-start gap-4">
                <div className="text-2xl md:text-3xl bg-teal-100 p-3 rounded-full">
                  {step.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-gray-800">
                    {step.title}
                  </h4>
                  <p className="text-gray-600 text-base">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Image */}
        <div className="flex-1 w-full max-w-md mx-auto">
          <Image
            src="/trip.png" // Update this path as needed
            alt="How it works illustration"
            width={600}
            height={600}
            className="pl-16 w-3/4 md:w-full h-auto object-contain"
          />
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
