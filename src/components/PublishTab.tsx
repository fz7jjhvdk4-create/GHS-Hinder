"use client";

import { useState, useEffect } from "react";
import { cachedFetch } from "@/lib/syncManager";

interface Stats {
  fenceTotal: number;
  fenceChecked: number;
  fenceRemaining: number;
  wings: number;
  ppTotal: number;
  ppChecked: number;
  ppRemaining: number;
}

export function PublishTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [fenceData, ppData] = (await Promise.all([
          cachedFetch("/api/fences"),
          cachedFetch("/api/pp"),
        ])) as [
          { stats: { total: number; checked: number; remaining: number; wings: number } },
          { stats: { total: number; checked: number; remaining: number } },
        ];

        setStats({
          fenceTotal: fenceData.stats.total,
          fenceChecked: fenceData.stats.checked,
          fenceRemaining: fenceData.stats.remaining,
          wings: fenceData.stats.wings,
          ppTotal: ppData.stats.total,
          ppChecked: ppData.stats.checked,
          ppRemaining: ppData.stats.remaining,
        });
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GHS_Hinderinventering_${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Exporten misslyckades. Forsok igen.");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#27ae60] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <h2 className="mb-3 text-sm font-bold text-[#1a3a6e]">
          Inventeringsoversikt
        </h2>

        {stats && (
          <div className="space-y-3">
            {/* Fences summary */}
            <div className="rounded-lg bg-[#f0f4fa] p-3">
              <div className="mb-1 text-xs font-bold text-[#2F5496]">
                🏇 Hinder
              </div>
              <div className="flex gap-4 text-sm">
                <span>
                  <strong>{stats.fenceTotal}</strong> totalt
                </span>
                <span className="text-[#27ae60]">
                  <strong>{stats.fenceChecked}</strong> klara
                </span>
                <span className="text-[#e74c3c]">
                  <strong>{stats.fenceRemaining}</strong> kvar
                </span>
                <span className="text-[#b8860b]">
                  <strong>{stats.wings}</strong> wings
                </span>
              </div>
              {stats.fenceTotal > 0 && (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-[#27ae60] transition-all"
                    style={{
                      width: `${(stats.fenceChecked / stats.fenceTotal) * 100}%`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* PP summary */}
            <div className="rounded-lg bg-[#faf5e8] p-3">
              <div className="mb-1 text-xs font-bold text-[#b8860b]">
                📏 Poles & Planks
              </div>
              <div className="flex gap-4 text-sm">
                <span>
                  <strong>{stats.ppTotal}</strong> totalt
                </span>
                <span className="text-[#27ae60]">
                  <strong>{stats.ppChecked}</strong> klara
                </span>
                <span className="text-[#e74c3c]">
                  <strong>{stats.ppRemaining}</strong> kvar
                </span>
              </div>
              {stats.ppTotal > 0 && (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-[#27ae60] transition-all"
                    style={{
                      width: `${(stats.ppChecked / stats.ppTotal) * 100}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Public link card */}
      <div className="rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <h2 className="mb-2 text-sm font-bold text-[#1a3a6e]">
          Publik lank
        </h2>
        <p className="mb-3 text-xs text-gray-500">
          Dela denna lank med kollegor, banbyggare eller andra som behover se
          inventeringen. Ingen inloggning kravs — alla med lanken kan lasa och
          skriva ut, men inte redigera.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={`${typeof window !== "undefined" ? window.location.origin : ""}/view`}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 select-all focus:border-[#2F5496] focus:outline-none"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={() => {
              const url = `${window.location.origin}/view`;
              navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="shrink-0 rounded-lg bg-[#2F5496] px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#1a3a6e]"
          >
            {copied ? "✓ Kopierad!" : "📋 Kopiera"}
          </button>
        </div>
        <a
          href="/view"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-[#2F5496] underline hover:text-[#1a3a6e]"
        >
          Oppna publik vy i ny flik →
        </a>
      </div>

      {/* Export card */}
      <div className="rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <h2 className="mb-2 text-sm font-bold text-[#1a3a6e]">
          Exportera som fil
        </h2>
        <p className="mb-4 text-xs text-gray-500">
          Ladda ner en fristaende HTML-fil med hela inventeringen. Filen fungerar
          offline och kan delas via e-post. Alla bilder baddas in direkt.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full rounded-lg border-2 border-[#1a3a6e] bg-white px-4 py-2.5 text-sm font-bold text-[#1a3a6e] shadow-sm hover:bg-[#f0f4fa] active:bg-[#e0e8f4] disabled:opacity-50"
        >
          {exporting ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Exporterar...
            </span>
          ) : (
            "⬇️ Ladda ner HTML-fil"
          )}
        </button>
      </div>
    </div>
  );
}
