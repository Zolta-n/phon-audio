import type { Metadata } from "next";
import { Playfair_Display, Lora } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });

export const metadata: Metadata = {
  title: "Phon.Audio — Signal Chain Compatibility Engine",
  description:
    "Find perfect gear pairings. Check impedance, power, gain staging, and damping across your full audio signal chain — source to speaker.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${lora.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer style={{
          background: "var(--pa-dark)",
          color: "rgba(253,246,236,0.35)",
          borderTop: "none",
          padding: "28px",
          textAlign: "center",
          fontSize: "0.8rem",
          letterSpacing: "0.06em",
          fontFamily: "var(--font-lora), Georgia, serif",
        }}>
          Phon.Audio — High-fidelity signal chain design © 2026
        </footer>
      </body>
    </html>
  );
}
