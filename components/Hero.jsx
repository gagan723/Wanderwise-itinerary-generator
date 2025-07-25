'use client';

import { useEffect, useState } from 'react';
import { FiSend } from 'react-icons/fi';
import Navbar from './Navbar';
import { useRouter } from "next/navigation";


const Hero = () => {

  const router = useRouter();
  const handleClick = () => {
    router.push("/trip")
  }

  const placeholderTexts = [
    "Describe your dream trip... ✈️ (e.g. 'I want to go to Italy with my mom in June for 10 days. Love museums and pasta!')",
    "Tell me about your ideal getaway... 🌸 (e.g. 'A solo trip to Japan in October for 6 days. Love anime, sushi, and scenic hikes!')",
    "Where do you want to explore next? 🌍 (e.g. 'A road trip across Spain with friends for 4 days, chasing sunsets and flamenco vibes with moderate budget!')",
    "What's your perfect itinerary? 🗼 (e.g. 'A romantic escape to Paris in spring for 1 week. Wine, art, and long evening strolls!')",
  ];

  const [placeholder, setPlaceholder] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const typeEffect = setTimeout(() => {
      if (charIndex < placeholderTexts[textIndex].length) {
        setPlaceholder((prev) => prev + placeholderTexts[textIndex][charIndex]);
        setCharIndex(charIndex + 1);
      } else {
        setTimeout(() => {
          setPlaceholder('');
          setCharIndex(0);
          setTextIndex((prev) => (prev + 1) % placeholderTexts.length);
        }, 2000);
      }
    }, 60);

    return () => clearTimeout(typeEffect);
  }, [charIndex, textIndex]);

  return (
	<div>
		<Navbar/>
    <section className="relative h-screen w-full overflow-hidden font-caveat animate-fadeInDown">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover"
      >
        <source src="/beach_video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/20 z-10" />

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center justify-center h-full px-6 text-white-50  text-center">
        <h1 className=" text-4xl md:text-7xl font-bold mb-4 drop-shadow-2xl">
            Hey, I'm Skye — your AI travel companion
        </h1>
        <p className=" text-xl font-semibold md:text-3xl max-w-3xl mb-8 drop-shadow-2xl">
          Let’s plan your dream trip. Describe what you want — from beach getaways to city escapes — and I’ll take care of the rest.
        </p>

        {/* Input Area */}
        <div className="relative w-full max-w-3xl">
          <textarea
            onFocus={handleClick}
            rows={4}
            spellCheck="false"
            className="w-full text-md md:text-2xl max-h-32 rounded-xl border border-teal-400 bg-white/90 p-4 text-gray-800 placeholder-gray-700 shadow-md focus:border-teal-500 focus:outline-none transition"
            placeholder={placeholder}
          />
          <FiSend className="absolute bottom-4 right-3 md:right-3 text-white bg-teal-500 text-[33px] px-2 rounded-full cursor-pointer" />
        </div>
      </div>
    </section>
	</div>
  );
};

export default Hero;
