import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phon.Audio Admin",
  description: "Discovery, collection and migration pipeline for the component catalog",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/discovery", label: "Discovery" },
  { href: "/collection", label: "Collection" },
  { href: "/staged", label: "Staged" },
  { href: "/runs", label: "Runs" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-adm-border bg-adm-surface">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-6">
            <Link href="/" className="font-bold text-adm-accent tracking-tight">
              Ω phon.audio <span className="text-adm-muted font-normal">admin</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-adm-muted hover:text-adm-text"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
