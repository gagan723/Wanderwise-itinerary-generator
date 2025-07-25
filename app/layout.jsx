import "./globals.css";
import SessionWrapper from "@/components/SessionWrapper";
import Footer from "@/components/Footer";
import { Inter, Poppins, Work_Sans, Caveat } from 'next/font/google'
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-poppins' })
const workSans = Work_Sans({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-work-sans' })
const caveat = Caveat({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-caveat' })

export const metadata = {
  title: "Wander Wise",
  description: "Your AI Travel Companion — Plan Smarter, Travel Better",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}  ${workSans.variable} ${caveat.variable}`}>
      <body>
        <main className="relative overflow-hidden font-worksans">
          <SessionWrapper>
            {children}
          </SessionWrapper>
        </main>
        <Toaster position="top-right"/>
        <Footer/>
      </body>
    </html>
  );
}
