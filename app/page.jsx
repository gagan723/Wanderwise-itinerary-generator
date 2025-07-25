"use client"
import About from "@/components/About";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Services from "@/components/Services";
import Testimonials from "@/components/Testimonials";
import TopDestinations from "@/components/TopDestinations";
import { SessionProvider } from "next-auth/react";

export default function Home() {
	return (
		<div className="pb-10">
			<SessionProvider>
				<Hero />
				<About />
				<Services />
				<HowItWorks />
				<TopDestinations />
				<Testimonials />
			</SessionProvider>
		</div>
	);
}
