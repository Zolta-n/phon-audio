"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-fetches the server page every few seconds while a run is in flight. */
export function AutoRefresh({ enabled, intervalMs = 5000 }: { enabled: boolean; intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [enabled, intervalMs, router]);

  return (
    <button className="adm-btn" onClick={() => router.refresh()}>
      {enabled ? "Auto-refreshing…" : "Refresh"}
    </button>
  );
}
