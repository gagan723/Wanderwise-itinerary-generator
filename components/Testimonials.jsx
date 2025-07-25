"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

const comments = [
  {
    pic: "/person-1.png",
    text: "Cool experience. The app showed me a couple of local spots I wouldn’t have found on Google. Felt more like a local than a tourist.",
    author: "Daniel M. – Adventure Seeker",
  },
  {
    pic: "/person-2.png",
    text: "I’m not usually a planner, but this helped me get my whole itinerary sorted without stressing over it. Way better than digging through emails and notes.",
    author: "James L. – Travel Blogger",
  },
  {
    pic: "/person-3.png",
    text: "Honestly didn’t expect much, but this app made my Southeast Asia trip so much easier. Everything was in one place, and I didn’t have to overthink anything.",
    author: "Sarah T. – Solo Traveler",
  },
  {
    pic: "/person-4.png",
    text: "The smart budgeting tool saved me hundreds! It tracked every booking and even suggested cheaper flight options. I felt in control the whole time.",
    author: "Carlos M. – BudgetConscious Explorer",
  },
  {
    pic: "/person-3.png",
    text: "I synced my itinerary to Google Calendar and never missed a thing. Having reminders pop up right before activities made it all feel seamless.",
    author: "Janet S. – Travel Enthusiast",
  },
];

const Testimonial = () => {
  const [currentComment, setCurrentComment] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setCurrentComment((prev) => (prev + 1) % comments.length);
        setFadeIn(true);
      }, 500);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-20 px-5 md:px-10 lg:px-28 bg-white animate-fadeInLeft">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start gap-10">
        {/* Left Side Heading */}
        <div className="md:w-1/2">
          <p className="text-sm uppercase text-teal-700 font-semibold mb-2">
            Testimonials
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-800">
            What People Say <br /> About Us
          </h2>
        </div>

        {/* Right Side Comment */}
        <div className="md:w-1/2">
          <div
            className={`bg-[#f9f9f9] rounded-xl shadow-lg p-6 transition-opacity duration-500 ease-in-out ${
              fadeIn ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="flex items-center gap-4 mb-4">
              <Image
                src={comments[currentComment].pic}
                alt="Author"
                width={50}
                height={50}
                className="rounded-full object-cover"
              />
              <span className="font-semibold text-gray-800">
                {comments[currentComment].author}
              </span>
            </div>
            <p className="text-gray-600 italic text-base leading-relaxed">
              “{comments[currentComment].text}”
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonial;
