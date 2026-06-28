import Link from "next/link";

export default function Navbar() {
  return (
    <header className="bg-slate-900 text-slate-50 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight hover:text-white">
          <span className="text-blue-400 text-lg">◎</span>
          <span>Phon.Audio</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-slate-400">
          <Link href="/builder" className="hover:text-slate-100 transition-colors">
            Chain Builder
          </Link>
          <Link href="/saved" className="hover:text-slate-100 transition-colors">
            Saved
          </Link>
          <Link
            href="/login"
            className="bg-slate-700 hover:bg-slate-600 text-slate-100 px-3 py-1.5 rounded-md transition-colors"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
