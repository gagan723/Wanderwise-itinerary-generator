"use client"
import { useRouter } from "next/navigation";

const About = () => {

  const router = useRouter();
  const handleClick = () => {
    router.push("/trip")
  }
  
  return (
    <section
      className="bg-white py-16 px-6 md:px-32 lg:pt-28 animate-fadeInLeft"
      id="about"
    >
      <div className="flex flex-col lg:flex-row items-center justify-between gap-12 max-w-7xl mx-auto">
        {/* Text Content */}
        <div className="lg:w-1/2">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-800 mb-4">
            More Information <br />
            <span className="text-teal-600 pl-4 md:pl-20 py-2 block">
              About WanderWise
            </span>
            
          </h2>
          <p className="text-gray-700 text-center text-sm md:text-base leading-relaxed">
            WanderWise is your smart AI-powered travel assistant, crafting personalized itineraries tailored to your travel style, budget, and preferences—whether you're setting off on a solo adventure, a romantic getaway, or a family vacation. No more endless searching—just tell us where you want to go, and we'll handle the details, from flights and stays to must-see spots, dining options, and hidden gems. Travel planning made simple, intuitive, and fun.
          </p>

          <button onClick={handleClick}  className="mt-6 px-6 py-3 bg-teal-600 text-white-50 text-lg font-medium  hover:bg-teal-700 transition">
            Start Planning
          </button>
        </div>

        {/* Image Gallery */}
        <div className="flex gap-4 lg:w-1/2 justify-center">
          <img
            src="/about1.jpg"
            alt="Beach view"
            className="w-[200px] max-h-[200px] md:max-h-[300px] object-cover shadow-md  mt-6 md:mt-10"
          />
          <img
            src="/about2.jpg"
            alt="Boat tour"
            className="w-[220px] max-h-[250px] md:min-h-[400px] object-cover shadow-md "
          />
        </div>
      </div>
    </section>
  );
};

export default About;
