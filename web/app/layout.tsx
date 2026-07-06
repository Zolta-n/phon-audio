import type { Metadata } from "next";
import { Playfair_Display, Lora } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});
const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
});

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
          padding: "36px",
          textAlign: "center",
          fontSize: "0.72rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontFamily: "var(--pa-font-ui)",
        }}>
          Phon<span style={{ color: "rgba(217,119,6,0.7)" }}>.</span>Audio — High-fidelity signal chain design © 2026
        </footer>
      </body>
    </html>
  );
}
