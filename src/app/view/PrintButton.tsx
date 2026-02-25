"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-[#2F5496] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#1a3a6e]"
    >
      🖨️ Skriv ut
    </button>
  );
}
