import Link from "next/link";

export default function SavedPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Saved Chains</h1>
      <p className="text-slate-500 mb-8">
        Sign in to save your signal chains and access them from any device.
      </p>
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
        <p className="text-4xl mb-4">🔒</p>
        <p className="font-medium text-slate-600 mb-4">Sign in to view saved chains</p>
        <Link
          href="/login"
          className="bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors inline-block"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
