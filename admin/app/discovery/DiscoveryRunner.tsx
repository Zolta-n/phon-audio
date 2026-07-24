"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ScrapeRunRow } from "../../lib/rows";

export interface SourceOption {
  id: string;
  name: string;
}

const POLL_MS = 4000;

const STAGE_LABEL: Record<string, string> = {
  gathering: "Gathering snippets from sources…",
  extracting: "Extracting brand/model mentions (LLM)…",
  matching: "Aggregating + matching against catalog…",
};

function runSummary(stats: Record<string, unknown>): string {
  const n = (k: string) => (typeof stats[k] === "number" ? (stats[k] as number) : null);
  const parts: string[] = [];
  if (n("snippets") != null) parts.push(`${n("snippets")} snippets`);
  if (n("mentions") != null) parts.push(`${n("mentions")} mentions`);
  if (n("components") != null) parts.push(`${n("components")} components (${n("newComponents") ?? 0} new)`);
  return parts.join(" · ");
}

export function DiscoveryRunner({
  sources,
  redditConfigured,
  initialRun,
}: {
  sources: SourceOption[];
  redditConfigured: boolean;
  initialRun: ScrapeRunRow | null;
}) {
  const router = useRouter();
  const [run, setRun] = useState<ScrapeRunRow | null>(initialRun);
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(sources.filter((s) => s.id !== "reddit" || redditConfigured).map((s) => s.id))
  );
  const [limit, setLimit] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Refresh the table exactly once per finished run, including runs that were
  // already in flight when the page loaded.
  const refreshedFor = useRef<string | null>(
    initialRun?.status === "running" ? null : (initialRun?.id ?? null)
  );

  const running = run?.status === "running";

  const poll = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`/api/discover?runId=${encodeURIComponent(runId)}`);
      if (!res.ok) return;
      const json = (await res.json()) as { run: ScrapeRunRow | null };
      if (json.run) setRun(json.run);
    } catch {
      // transient network error — next tick will retry
    }
  }, []);

  useEffect(() => {
    if (!run || run.status !== "running") return;
    const timer = setInterval(() => poll(run.id), POLL_MS);
    return () => clearInterval(timer);
  }, [run, poll]);

  useEffect(() => {
    if (run && run.status !== "running" && refreshedFor.current !== run.id) {
      refreshedFor.current = run.id;
      router.refresh();
    }
  }, [run, router]);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { sources: [...checked] };
      const parsedLimit = parseInt(limit, 10);
      if (Number.isFinite(parsedLimit) && parsedLimit > 0) body.limit = parsedLimit;
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { runId?: string; error?: string };
      if (res.status === 409 && json.runId) {
        // A run is already in flight (e.g. started from another tab) — follow it.
        await poll(json.runId);
        return;
      }
      if (!res.ok || !json.runId) throw new Error(json.error ?? `HTTP ${res.status}`);
      setRun({
        id: json.runId,
        kind: "discovery",
        status: "running",
        params: {},
        stats: { stage: "gathering" },
        error: null,
        started_at: new Date().toISOString(),
        finished_at: null,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const stage = typeof run?.stats["stage"] === "string" ? (run.stats["stage"] as string) : null;

  return (
    <div className="adm-card p-4 mb-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="font-medium">Sources:</span>
        {sources.map((s) => {
          const unavailable = s.id === "reddit" && !redditConfigured;
          return (
            <label
              key={s.id}
              className={unavailable ? "text-adm-muted cursor-not-allowed" : "cursor-pointer"}
              title={unavailable ? "Set REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET in admin/.env.local" : undefined}
            >
              <input
                type="checkbox"
                className="mr-1.5 align-middle"
                checked={checked.has(s.id)}
                disabled={unavailable || running}
                onChange={() => toggle(s.id)}
              />
              {s.name}
              {unavailable && " (no API key)"}
            </label>
          );
        })}
        <label className="flex items-center gap-1.5">
          <span className="text-adm-muted">Limit/source:</span>
          <input
            type="number"
            className="adm-input !w-20"
            placeholder="all"
            min={1}
            max={100}
            value={limit}
            disabled={running}
            onChange={(e) => setLimit(e.target.value)}
          />
        </label>
        <div className="grow" />
        <button
          className="adm-btn adm-btn-primary"
          disabled={busy || running || checked.size === 0}
          onClick={start}
        >
          {running ? "Running…" : "Run discovery"}
        </button>
      </div>

      {error && <p className="text-sm text-adm-err mt-3">{error}</p>}

      {run && (
        <div className="mt-3 pt-3 border-t border-adm-border text-sm">
          {running ? (
            <p>
              <span className="adm-badge adm-badge-warn mr-2">running</span>
              {STAGE_LABEL[stage ?? ""] ?? "Working…"}{" "}
              <span className="text-adm-muted">{runSummary(run.stats)}</span>
            </p>
          ) : run.status === "succeeded" ? (
            <p>
              <span className="adm-badge adm-badge-ok mr-2">succeeded</span>
              Last run: {runSummary(run.stats) || "no stats"}
              <span className="text-adm-muted">
                {" "}
                · {new Date(run.finished_at ?? run.started_at).toLocaleString()}
              </span>
            </p>
          ) : (
            <p>
              <span className="adm-badge adm-badge-err mr-2">{run.status}</span>
              {run.error ?? "No error recorded."}
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-adm-muted mt-3">
        Fetches community sources, then runs LLM extraction (Anthropic API usage). Counts accumulate
        across runs. Takes a few minutes; you can leave the page — progress lands in Runs.
      </p>
    </div>
  );
}
