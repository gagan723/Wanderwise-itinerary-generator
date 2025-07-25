"use client";

import Link from "next/link";
import { RiFunctionLine, RiCloseLine } from "react-icons/ri";
import { FaUser } from "react-icons/fa";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Loader } from "lucide-react";

const Navbar = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const [showUserMenu, setShowUserMenu] = useState(false);
	const router = useRouter();
	const { data: session, status } = useSession();

	const NAV_LINKS = [
		{ href: "/", key: "home", label: "Home" },
		{ href: "/#about", key: "about", label: "About" },
		{ href: "/#topdest", key: "TopDest", label: "Top Destinations" },
		{ href: "/#footer", key: "contact_us", label: "Contact Us" },
	];

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 20);
		};

		const handleClickOutside = (event) => {
			if (showUserMenu && !event.target.closest(".user-menu-container")) {
				setShowUserMenu(false);
			}
		};

		// ✅ Only apply scrolled styles on initial load *if* already scrolled
		if (typeof window !== "undefined") {
			if (window.scrollY > 20) {
				setIsScrolled(true);
			}
		}

		window.addEventListener("scroll", handleScroll);
		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			window.removeEventListener("scroll", handleScroll);
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [showUserMenu]);

	const handleSignOut = async () => {
		await signOut({
			redirect: false,
		});
		router.push("/");
	};

	const renderAuthButton = () => {
		if (status === "loading") {
			return <Loader className="size-6 animate-spin" />;
		}

		if (session) {
			return (
				<div className="relative user-menu-container ml-6 pl-6 border-l border-slate-300/50">
					<button
						onClick={() => setShowUserMenu(!showUserMenu)}
						className="outline-none"
					>
						<div className="flex gap-3 items-center hover:opacity-75 transition bg-slate-100/10 hover:bg-slate-100/20 rounded-full px-3 py-2 backdrop-blur-sm">
							<span className="hidden sm:block font-medium text-sm">
								{session.user?.name?.length > 7
									? session.user.name.substring(0, 7) + "..."
									: session.user?.name}
							</span>
							<div className="size-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm ring-2 ring-white/20">
								{session.user?.image ? (
									<img
										src={session.user.image}
										alt="User avatar"
										className="size-9 rounded-full object-cover"
									/>
								) : (
									session.user?.name?.charAt(0).toUpperCase()
								)}
							</div>
						</div>
					</button>
					{showUserMenu && (
						<div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 backdrop-blur-sm">
							<div className="px-4 py-3 border-b border-gray-100">
								<p className="font-medium text-sm text-gray-900">
									{session.user?.name}
								</p>
								<p className="text-xs text-gray-500">
									{session.user?.email}
								</p>
							</div>
							<button
								onClick={handleSignOut}
								className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
							>
								Log out
							</button>
						</div>
					)}
				</div>
			);
		}

		return (
			<div className="ml-6 pl-6 border-l border-slate-300/50">
				<button
					onClick={() => router.push("/auth/sign-in")}
					className="border border-slate-300/50 rounded-full px-4 py-2 flex items-center gap-2 hover:bg-teal-500 hover:border-teal-500 transition bg-white/10 backdrop-blur-sm"
				>
					<FaUser className="text-sm" />
					<span className="text-sm font-medium">Login</span>
				</button>
			</div>
		);
	};

	const renderMobileAuthButton = () => {
		if (status === "loading") {
			return <Loader className="size-6 animate-spin mx-auto" />;
		}

		if (session) {
			return (
				<div className="mt-6 pt-6 border-t border-slate-200">
					<div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-lg">
						<div className="size-12 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-semibold shadow-sm">
							{session.user?.image ? (
								<img
									src={session.user.image}
									alt="User avatar"
									className="size-12 rounded-full object-cover"
								/>
							) : (
								session.user?.name?.charAt(0).toUpperCase()
							)}
						</div>
						<div>
							<p className="font-semibold text-base text-slate-900">
								{session.user?.name}
							</p>
							<p className="text-sm text-slate-600">
								{session.user?.email}
							</p>
						</div>
					</div>
					<button
						onClick={handleSignOut}
						className="w-full border border-slate-300 rounded-full px-4 py-2 flex items-center justify-center gap-2 hover:bg-teal-500 hover:text-white hover:border-teal-500 transition font-medium"
					>
						<span>Logout</span>
					</button>
				</div>
			);
		}

		return (
			<div className="mt-6 pt-6 border-t border-slate-200">
				<button
					onClick={() => router.push("/auth/sign-in")}
					className="w-full border border-slate-300 rounded-full px-4 py-2 flex items-center justify-center gap-2 hover:bg-teal-500 hover:text-white hover:border-teal-500 transition font-medium"
				>
					<FaUser />
					<span>Login</span>
				</button>
			</div>
		);
	};

	return (
		<nav
			className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
				isScrolled
					? "bg-white-50 text-slate-900 shadow-sm border-b border-slate-100"
					: "bg-transparent text-white-50"
			}`}
		>
			<div className="flex items-center justify-between max-container padding-container py-3 px-6">
				<Link href="/">
					<span className="font-caveat text-4xl md:text-5xl font-semibold">
						Wander<span className="text-teal-400">Wise</span>
					</span>
				</Link>

				{/* Desktop Nav */}
				<div className="hidden md:flex items-center">
					<div className="flex gap-6 items-center">
						{NAV_LINKS.map((link) => (
							<Link
								href={link.href}
								key={link.key}
								className="font-semibold text-base hover:text-teal-500 transition"
							>
								{link.label}
							</Link>
						))}
					</div>
					{renderAuthButton()}
				</div>

				{/* Mobile Hamburger */}
				<div className="md:hidden">
					<RiFunctionLine
						className="text-2xl cursor-pointer"
						onClick={() => setIsOpen(true)}
					/>
				</div>
			</div>

			{/* Mobile Sidebar */}
			<div
				className={`fixed top-0 right-0 h-screen w-3/4 bg-white-50 text-slate-900 z-50 transform transition-transform duration-300 ${
					isOpen ? "translate-x-0" : "translate-x-full"
				}`}
			>
				<div className="flex justify-end items-center px-5 pt-4">
					<RiCloseLine
						className="text-2xl cursor-pointer"
						onClick={() => setIsOpen(false)}
					/>
				</div>
				<div className="flex flex-col gap-6 p-6">
					{NAV_LINKS.map((link) => (
						<Link
							href={link.href}
							key={link.key}
							className="font-semibold text-base hover:text-teal-700 transition"
							onClick={() => setIsOpen(false)}
						>
							{link.label}
						</Link>
					))}
					{renderMobileAuthButton()}
				</div>
			</div>
		</nav>
	);
};

export default Navbar;