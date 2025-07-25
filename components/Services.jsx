import React from "react";
import { FaRobot } from "react-icons/fa6";
import { FaMoneyBillWave } from "react-icons/fa";
import { LuCalendar1 } from "react-icons/lu";
import { MdOutlineCloudOff } from "react-icons/md";

const services = [
  {
    icon: <FaRobot className="text-white-50 text-2xl md:text-3xl" />,
    title: "AI-Powered Itinerary",
    desc: "Instantly generate customized travel plans based on your interests, time, and budget.",
  },
  {
    icon: <LuCalendar1 className="text-white-50 text-2xl md:text-3xl" />,
    title: "Calendar Sync",
    desc: "One-click sync with Google Calendar for daily plan visibility and reminders.",
  },
  {
    icon: <MdOutlineCloudOff className="text-white-50 text-2xl md:text-3xl" />,
    title: "Local Experience Finder",
    desc: "Discover hidden gems, local food spots, and unique activities using AI-curated insights.",
  },
  {
    icon: <FaMoneyBillWave className="text-white-50 text-2xl md:text-3xl" />,
    title: "Smart Budgeting",
    desc: "Get detailed budget breakdowns for flights, hotels, food, and activities.",
  },
];

const Services = () => {
  return (
    <section className=" px-6 md:px-20 my-10 animate-fadeInLeft" id="services">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 md:gap-10">
          {services.map((service, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center  rounded-xl p-6 transition"
            >
              <div className="bg-teal-500 p-2 rounded-full mb-2">
                {service.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">
                {service.title}
              </h3>
              <p className="text-gray-900 text-sm">{service.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
