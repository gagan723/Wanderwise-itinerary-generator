"use client";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";

import { EffectCoverflow, Pagination } from "swiper/modules";

const destinations = [
	{
		name: "Bangkok",
		tours: "White temple, Bangkok",
		image: "/bangkok.jpeg",
	},
	{
		name: "Bali",
		tours: "Bali, Indonesia",
		image: "/Bali.webp",
	},
	{
		name: "Germany",
		tours: "Neuschwanstein Castle",
		image: "/GermanyNeuschwanstein.jpeg",
	},
	{
		name: "Tokyo",
		tours: "Tokyo, Japan",
		image: "/tokyo.jpg",
	},
	{
		name: "Santorini",
		tours: "Blue Domes, Greece",
		image: "/santorini.jpg",
	},
];

const TopDestinations = () => {
	return (
		<section className="py-32 animate-fadeInLeft" id="topdest">
			<h2 className="text-3xl md:text-5xl font-bold mb-12 text-gray-800 text-center">
				Discover The Most <br />
				<span className="text-teal-600">Attractive Places</span>
			</h2>

			<div className="w-[75vw] md:max-w-[51vw] mx-auto px-4">
				<Swiper
					effect="coverflow"
					grabCursor={true}
					centeredSlides={true}
					loop={true}
					slidesPerView="auto"
					spaceBetween={50}
					coverflowEffect={{
						rotate: 0,
						stretch: 0,
						depth: 100,
						modifier: 2,
						slideShadows: false,
					}}
					pagination={{
						clickable: true,
						el: ".swiper-pagination", // Target external div
					}}
					modules={[EffectCoverflow, Pagination]}
					className="w-full"
				>
					{destinations.map((place, index) => (
						<SwiperSlide key={index} className="md:w-[30vw] md:max-w-[250px] h-[450px]">
							<div className="relative h-full overflow-hidden shadow-lg">
								<img src={place.image} alt={place.name} className="h-[380px] object-cover" />
								<div className="absolute  bottom-0 p-4 text-white-50">
									<p className="text-xl  font-semibold">{place.name}</p>
									<p className="text-sm ">{place.tours}</p>
								</div>
							</div>
						</SwiperSlide>
					))}
				</Swiper>

				{/* External Pagination Below */}
				<div className="swiper-pagination flex justify-center"></div>
			</div>
		</section>
	);
};

export default TopDestinations;