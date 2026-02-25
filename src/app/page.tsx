"use client";

import { useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { FenceList } from "@/components/FenceList";
import { PPList } from "@/components/PPList";

type Tab = "fences" | "pp" | "publish";

const tabs: { id: Tab; label: string; activeColor: string }[] = [
  { id: "fences", label: "🏇 Hinder", activeColor: "#2F5496" },
  { id: "pp", label: "📏 Poles & Planks", activeColor: "#b8860b" },
  { id: "publish", label: "📋 Publicera", activeColor: "#27ae60" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("fences");

  return (
    <div className="min-h-[100dvh] bg-[#f0f2f5]">
      {/* Header */}
      <header className="flex items-center justify-center gap-4 bg-gradient-to-br from-[#0a1628] via-[#1a3a6e] to-[#2F5496] px-5 py-4 text-white shadow-lg">
        <img
          src="/ghs-logo.jpg"
          alt="Gothenburg Horse Show"
          className="h-10 w-auto shrink-0 sm:h-12"
        />
        <div className="text-center">
          <h1 className="text-base font-bold leading-tight sm:text-xl">
            GHS — Hinderförteckning
          </h1>
          <p className="text-[10px] text-white/70 sm:text-xs">
            Gothenburg Horse Show
          </p>
        </div>
        <LogoutButton />
      </header>

      {/* Content area */}
      <div className="mx-auto max-w-3xl px-3 py-3 sm:px-4">
        {/* Main tabs */}
        <div className="flex gap-1 rounded-[10px] bg-white p-1 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-lg px-2 py-2.5 text-center text-xs font-bold transition-colors sm:text-sm ${
                activeTab === tab.id ? "text-white" : "text-gray-500"
              }`}
              style={
                activeTab === tab.id
                  ? { backgroundColor: tab.activeColor }
                  : undefined
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-3">
          {activeTab === "fences" && <FenceList />}
          {activeTab === "pp" && <PPList />}
          {activeTab === "publish" && (
            <div className="rounded-xl bg-white p-8 text-center shadow-sm">
              <span className="text-4xl">📋</span>
              <p className="mt-3 text-sm font-medium text-gray-400">
                Publicera — kommer i US-009
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
