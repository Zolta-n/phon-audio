import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Phon.Audio — Signal Chain Compatibility Engine",
  description:
    "Find perfect gear pairings. Check impedance, power, gain staging, and damping across your full audio signal chain — source to speaker.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
          Phon.Audio — deterministic audio compatibility engine. Specs are illustrative until verified.
          &nbsp;·&nbsp;MIT License
        </footer>
      </body>
    </html>
  );
}
