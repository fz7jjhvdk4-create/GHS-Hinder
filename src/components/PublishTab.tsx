"use client";

import { useState, useEffect } from "react";

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

  useEffect(() => {
    async function fetchStats() {
      try {
        const [fenceRes, ppRes] = await Promise.all([
          fetch("/api/fences"),
          fetch("/api/pp"),
        ]);
        const fenceData = await fenceRes.json();
        const ppData = await ppRes.json();

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

      {/* Export card */}
      <div className="rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <h2 className="mb-2 text-sm font-bold text-[#1a3a6e]">
          Exportera inventering
        </h2>
        <p className="mb-4 text-xs text-gray-500">
          Genererar en fristaende HTML-fil med hela inventeringen. Filen fungerar
          offline och kan delas med kollegor utan inloggning. Alla bilder baddas
          in direkt i filen.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full rounded-lg bg-gradient-to-br from-[#1a3a6e] to-[#27ae60] px-4 py-3 text-sm font-bold text-white shadow hover:opacity-90 active:opacity-80 disabled:opacity-50"
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
            "📋 Exportera som HTML"
          )}
        </button>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
        <strong>Tips:</strong> Den exporterade filen kan oppnas i vilken
        webblasare som helst, skrivas ut som PDF, eller skickas via e-post. Alla
        bilder ar inbaddade direkt i filen sa den fungerar helt offline.
      </div>
    </div>
  );
}
