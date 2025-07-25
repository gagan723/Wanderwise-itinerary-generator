/** @type {import('tailwindcss').Config} */
export default {
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			fontFamily: {
				inter: "var(--font-inter)",
				poppins: "var(--font-poppins",
				worksans: "var(--font-work-sans)",
				caveat: "var(--font-caveat)",
			},
			colors: {
				white: {
					DEFAULT: "#FFFFFF",
					50: "#F6FEFF",
				},				
			},
			backgroundImage: {
				"bg-img-1": "url('/img-1.png')",
				"bg-img-2": "url('/img-2.png')",
				"feature-bg": "url('/feature-bg.png')",
				pattern: "url('/pattern.png')",
				"pattern-2": "url('/pattern-bg.png')",
			},
			screens: {
				xs: "400px",
				"3xl": "1680px",
				"4xl": "2200px",
			},
			maxWidth: {
				"10xl": "1512px",
			},
			borderRadius: {
				"5xl": "40px",
			},
			keyframes: {
				fadeIn: {
					"0%": { opacity: 0 },
					"100%": { opacity: 1 },
				},
				fadeOut: {
					"0%": { opacity: 1 },
					"100%": { opacity: 0 },
				},
				fadeInDown: {
					"0%": {
						opacity: "0",
						transform: "translateY(-40px)",
					},
					"100%": {
						opacity: "1",
						transform: "translateY(0)",
					},
				},
				fadeInLeft: {
					"0%": {
						opacity: "0",
						transform: "translateX(-40px)",
					},
					"100%": {
						opacity: "1",
						transform: "translateX(0)",
					},
				},
			},
			animation: {
				fadeIn: "fadeIn 1.5s ease-in-out forwards",
				fadeOut: "fadeOut 1.5s ease-in-out forwards",
				fadeInDown: "fadeInDown 0.8s ease-out forwards",
				fadeInLeft: "fadeInLeft 0.8s ease-out forwards",
			},
		},
	},
	plugins: [],
};
