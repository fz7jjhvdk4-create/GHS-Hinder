"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Fel kod");
        setPin("");
        inputRef.current?.focus();
      }
    } catch {
      setError("Kunde inte ansluta till servern");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-[#0a1628] via-[#1a3a6e] to-[#2F5496] px-4">
      <div className="w-full max-w-[380px] rounded-[20px] bg-white/95 px-9 py-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
        {/* Logo placeholder — GHS horse icon */}
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#1a3a6e] to-[#2F5496]">
          <span className="text-5xl">🏇</span>
        </div>

        <h1 className="mb-1 text-xl font-bold text-[#1a3a6e]">GHS 2026</h1>
        <p className="mb-6 text-sm text-gray-400">Hinderinventering</p>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Ange kod"
            maxLength={20}
            autoComplete="off"
            inputMode="text"
            disabled={loading}
            className="mb-3 w-full rounded-[10px] border-2 border-gray-200 px-4 py-3.5 text-center text-base font-semibold tracking-[3px] transition-colors focus:border-[#2F5496] focus:outline-none disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full rounded-[10px] bg-gradient-to-br from-[#1a3a6e] to-[#2F5496] px-4 py-3.5 text-[1.05em] font-bold text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="h-5 w-5 animate-spin"
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
                Loggar in...
              </span>
            ) : (
              "Logga in"
            )}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-sm font-medium text-red-500 animate-in fade-in">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
