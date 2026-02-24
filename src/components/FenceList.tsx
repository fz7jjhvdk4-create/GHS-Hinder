"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FenceCard } from "./FenceCard";

// ─── Types ────────────────────────────────────────────────
interface Section {
  id: string;
  name: string;
  color: string;
  type: string;
  sortOrder: number;
}

interface FenceImage {
  id: string;
  imageUrl: string;
  caption: string;
  isPrimary: boolean;
}

export interface FenceComponent {
  id: string;
  type: string;
  count: number;
  description: string;
  bomId: string;
}

export interface Fence {
  id: string;
  name: string;
  sectionId: string;
  section: Section;
  checked: boolean;
  notes: string;
  sortOrder: number;
  images: FenceImage[];
  components: FenceComponent[];
}

interface Stats {
  total: number;
  checked: number;
  remaining: number;
  wings: number;
}

type FilterType = "alla" | "klara" | "kvar" | string;

// ─── Component ────────────────────────────────────────────

export function FenceList() {
  const [fences, setFences] = useState<Fence[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    checked: 0,
    remaining: 0,
    wings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("alla");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/fences");
      const data = await res.json();
      setFences(data.fences);
      setSections(data.sections);
      setStats(data.stats);
    } catch (err) {
      console.error("Failed to fetch fences:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Show toast
  function showToast(message: string) {
    setToast(message);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 2000);
  }

  // Recalculate wings stat from current fences
  function recalcWings(fencesList: Fence[]): number {
    return fencesList.reduce((sum, f) => {
      const wingsComp = f.components.find(
        (c) => c.type.toLowerCase() === "wings"
      );
      return sum + (wingsComp?.count ?? 0);
    }, 0);
  }

  // ─── Fence handlers ──────────────────────────────────────

  async function handleToggleChecked(fenceId: string) {
    const fence = fences.find((f) => f.id === fenceId);
    if (!fence) return;

    const newChecked = !fence.checked;
    setFences((prev) =>
      prev.map((f) => (f.id === fenceId ? { ...f, checked: newChecked } : f))
    );
    setStats((prev) => ({
      ...prev,
      checked: prev.checked + (newChecked ? 1 : -1),
      remaining: prev.remaining + (newChecked ? -1 : 1),
    }));
    showToast(newChecked ? "✅ Avbockad" : "↩️ Avbockning borttagen");

    try {
      await fetch(`/api/fences/${fenceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked: newChecked }),
      });
    } catch {
      setFences((prev) =>
        prev.map((f) =>
          f.id === fenceId ? { ...f, checked: !newChecked } : f
        )
      );
      setStats((prev) => ({
        ...prev,
        checked: prev.checked + (newChecked ? -1 : 1),
        remaining: prev.remaining + (newChecked ? 1 : -1),
      }));
      showToast("❌ Kunde inte spara");
    }
  }

  async function handleNotesChange(fenceId: string, notes: string) {
    setFences((prev) =>
      prev.map((f) => (f.id === fenceId ? { ...f, notes } : f))
    );
    try {
      await fetch(`/api/fences/${fenceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
    } catch {
      showToast("❌ Kunde inte spara anteckning");
    }
  }

  // ─── Component handlers ─────────────────────────────────

  async function handleComponentUpdate(
    compId: string,
    fenceId: string,
    data: Partial<FenceComponent>
  ) {
    // Optimistic update
    setFences((prev) => {
      const updated = prev.map((f) => {
        if (f.id !== fenceId) return f;
        return {
          ...f,
          components: f.components.map((c) =>
            c.id === compId ? { ...c, ...data } : c
          ),
        };
      });
      // Recalculate wings if count changed
      if (data.count !== undefined) {
        setStats((s) => ({ ...s, wings: recalcWings(updated) }));
      }
      return updated;
    });

    try {
      await fetch(`/api/components/${compId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch {
      showToast("❌ Kunde inte spara komponent");
      fetchData(); // Revert by refetching
    }
  }

  async function handleComponentAdd(fenceId: string, type: string) {
    // Optimistic: add temp component
    const tempId = "temp_" + Date.now();
    setFences((prev) =>
      prev.map((f) => {
        if (f.id !== fenceId) return f;
        return {
          ...f,
          components: [
            ...f.components,
            { id: tempId, type, count: 0, description: "", bomId: "" },
          ],
        };
      })
    );

    try {
      const res = await fetch("/api/components", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fenceId, type }),
      });
      const newComp = await res.json();

      // Replace temp with real
      setFences((prev) =>
        prev.map((f) => {
          if (f.id !== fenceId) return f;
          return {
            ...f,
            components: f.components.map((c) =>
              c.id === tempId ? newComp : c
            ),
          };
        })
      );
      showToast(`➕ ${type} tillagd`);
    } catch {
      // Remove temp
      setFences((prev) =>
        prev.map((f) => {
          if (f.id !== fenceId) return f;
          return {
            ...f,
            components: f.components.filter((c) => c.id !== tempId),
          };
        })
      );
      showToast("❌ Kunde inte lägga till komponent");
    }
  }

  async function handleComponentDelete(compId: string, fenceId: string) {
    // Optimistic
    const prevFences = fences;
    setFences((prev) => {
      const updated = prev.map((f) => {
        if (f.id !== fenceId) return f;
        return {
          ...f,
          components: f.components.filter((c) => c.id !== compId),
        };
      });
      setStats((s) => ({ ...s, wings: recalcWings(updated) }));
      return updated;
    });
    showToast("🗑️ Komponent borttagen");

    try {
      await fetch(`/api/components/${compId}`, { method: "DELETE" });
    } catch {
      setFences(prevFences);
      showToast("❌ Kunde inte ta bort");
    }
  }

  // ─── Filter & Search ─────────────────────────────────────

  const filteredFences = fences.filter((f) => {
    if (search) {
      const q = search.toLowerCase();
      if (!f.name.toLowerCase().includes(q)) return false;
    }
    if (filter === "klara" && !f.checked) return false;
    if (filter === "kvar" && f.checked) return false;
    if (
      filter !== "alla" &&
      filter !== "klara" &&
      filter !== "kvar" &&
      f.sectionId !== filter
    )
      return false;
    return true;
  });

  const groupedFences = new Map<string, Fence[]>();
  for (const fence of filteredFences) {
    const key = fence.sectionId;
    if (!groupedFences.has(key)) groupedFences.set(key, []);
    groupedFences.get(key)!.push(fence);
  }

  const filterOptions: {
    label: string;
    value: FilterType;
    variant?: string;
  }[] = [
    { label: "Alla", value: "alla" },
    ...sections.map((s) => ({ label: s.name, value: s.id })),
    { label: `✅ Klara (${stats.checked})`, value: "klara", variant: "green" },
    { label: `⬜ Kvar (${stats.remaining})`, value: "kvar", variant: "red" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2F5496] border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Stats bar */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { label: "Totalt", value: stats.total, color: "#2F5496" },
          { label: "Klara", value: stats.checked, color: "#27ae60" },
          { label: "Kvar", value: stats.remaining, color: "#e74c3c" },
          { label: "Wings", value: stats.wings, color: "#b8860b" },
        ].map((s) => (
          <div
            key={s.label}
            className="min-w-[70px] flex-1 rounded-[10px] bg-white px-3 py-2.5 text-center shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
          >
            <div className="text-xl font-bold" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-[0.68em] font-medium uppercase tracking-wide text-gray-400">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mt-3">
        <input
          type="search"
          placeholder="🔍 Sök hinder..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium transition-colors placeholder:text-gray-400 focus:border-[#2F5496] focus:outline-none"
        />
      </div>

      {/* Filter tabs */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {filterOptions.map((opt) => {
          const isActive = filter === opt.value;
          let activeClass = "border-[#2F5496] bg-[#2F5496] text-white";
          if (opt.variant === "green")
            activeClass = "border-[#27ae60] bg-[#27ae60] text-white";
          if (opt.variant === "red")
            activeClass = "border-[#e74c3c] bg-[#e74c3c] text-white";

          return (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`rounded-full border-2 px-3 py-1 text-xs font-semibold transition-colors ${
                isActive
                  ? activeClass
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Fence list grouped by section */}
      <div className="mt-4 space-y-1">
        {Array.from(groupedFences.entries()).map(
          ([sectionId, sectionFences]) => {
            const section = sections.find((s) => s.id === sectionId);
            if (!section) return null;

            return (
              <div key={sectionId}>
                <div
                  className="mt-3 mb-1.5 rounded-lg px-3.5 py-2 text-sm font-bold text-white"
                  style={{ backgroundColor: section.color }}
                >
                  {section.name}
                  <span className="ml-2 text-xs font-normal opacity-80">
                    ({sectionFences.length})
                  </span>
                </div>

                {sectionFences.map((fence) => (
                  <FenceCard
                    key={fence.id}
                    fence={fence}
                    onToggleChecked={handleToggleChecked}
                    onNotesChange={handleNotesChange}
                    onComponentUpdate={handleComponentUpdate}
                    onComponentAdd={handleComponentAdd}
                    onComponentDelete={handleComponentDelete}
                  />
                ))}
              </div>
            );
          }
        )}

        {filteredFences.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">
            Inga hinder hittades
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 animate-[fadeUp_0.3s_ease] rounded-[10px] bg-[#333] px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
          {toast}
        </div>
      )}
    </div>
  );
}
