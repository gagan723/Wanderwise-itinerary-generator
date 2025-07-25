import Link from "next/link";
import { FaTwitter, FaInstagram, FaLinkedin } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 py-10 px-6 lg:px-20" id="footer">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div>
          <h2 className="text-white text-xl font-bold mb-2">WanderWise</h2>
          <p className="text-sm">Plan less. Travel more.</p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-white font-semibold mb-2">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/">Home</Link></li>
            <li><Link href="/#about">Features</Link></li>
            <li><Link href="/#how-it-works">How It Works</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="text-white font-semibold mb-2">Support</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/help">Help Center</Link></li>
            <li><Link href="/terms">Terms of Service</Link></li>
            <li><Link href="/privacy">Privacy Policy</Link></li>
          </ul>
        </div>

        {/* Newsletter + Socials */}
        <div>
          <h4 className="text-white font-semibold mb-2">Stay Updated</h4>
          <p className="text-sm mb-3">Get travel tips & feature updates</p>
          <form className="flex items-center gap-2">
            <input
              type="email"
              placeholder="Your email"
              className="flex-1 px-3 py-2 rounded-md text-sm text-black"
            />
            <button className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 text-sm rounded-md">
              Subscribe
            </button>
          </form>

          <div className="flex gap-4 mt-4 text-lg">
            <a href="#" aria-label="Twitter"><FaTwitter /></a>
            <a href="#" aria-label="Instagram"><FaInstagram /></a>
            <a href="#" aria-label="LinkedIn"><FaLinkedin /></a>
          </div>
        </div>
      </div>

      <div className="text-center mt-10 text-xs text-gray-500">
        © {new Date().getFullYear()} WanderWise. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
