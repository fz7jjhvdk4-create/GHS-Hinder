"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PPCard } from "./PPCard";
import { SectionHeader } from "./SectionHeader";
import { ColorPatternEditor } from "./ColorPatternEditor";
import type { PPItem } from "./PPCard";
import type { ColorSegment } from "./ColorPatternSVG";

// ─── Types ────────────────────────────────────────────────
interface PPSection {
  id: string;
  name: string;
  color: string;
  type: string;
  sortOrder: number;
}

interface Stats {
  total: number;
  checked: number;
  remaining: number;
}

type FilterType = "alla" | "klara" | "kvar" | string;

// ─── Component ────────────────────────────────────────────

export function PPList() {
  const [items, setItems] = useState<PPItem[]>([]);
  const [sections, setSections] = useState<PPSection[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    checked: 0,
    remaining: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("alla");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editorItemId, setEditorItemId] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/pp");
      const data = await res.json();
      setItems(data.items);
      setSections(data.sections);
      setStats(data.stats);
    } catch (err) {
      console.error("Failed to fetch poles/planks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 2000);
  }

  // ─── Item handlers ──────────────────────────────────────

  async function handleToggleChecked(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const newChecked = !item.checked;
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, checked: newChecked } : i))
    );
    setStats((prev) => ({
      ...prev,
      checked: prev.checked + (newChecked ? 1 : -1),
      remaining: prev.remaining + (newChecked ? -1 : 1),
    }));
    showToast(newChecked ? "✅ Avbockad" : "↩️ Avbockning borttagen");

    try {
      await fetch(`/api/pp/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked: newChecked }),
      });
    } catch {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, checked: !newChecked } : i
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

  async function handleNoteChange(id: string, note: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, note } : i))
    );
    try {
      await fetch(`/api/pp/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
    } catch {
      showToast("❌ Kunde inte spara anteckning");
    }
  }

  async function handleCountChange(id: string, count: number) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, count } : i))
    );
    try {
      await fetch(`/api/pp/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
    } catch {
      showToast("❌ Kunde inte spara antal");
    }
  }

  async function handleBomIdChange(id: string, bomId: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, bomId } : i))
    );
    try {
      await fetch(`/api/pp/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bomId }),
      });
    } catch {
      showToast("❌ Kunde inte spara BOM-ID");
    }
  }

  async function handleColorPatternSave(
    id: string,
    colorPattern: ColorSegment[],
    colorImage: string
  ) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, colorPattern, colorImage } : i))
    );
    showToast(colorImage ? "📷 Bild sparad" : "🎨 Fargmonster sparat");

    try {
      await fetch(`/api/pp/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colorPattern, colorImage }),
      });
    } catch {
      fetchData();
      showToast("❌ Kunde inte spara");
    }
  }

  async function handleMovePP(id: string, newSectionId: string) {
    const item = items.find((i) => i.id === id);
    if (!item || item.sectionId === newSectionId) return;

    const prevItems = items;
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, sectionId: newSectionId } : i
      )
    );
    showToast("↔️ Flyttad");

    try {
      await fetch(`/api/pp/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: newSectionId }),
      });
    } catch {
      setItems(prevItems);
      showToast("❌ Kunde inte flytta");
    }
  }

  async function handleDeletePP(id: string) {
    const prevItems = items;
    setItems((prev) => prev.filter((i) => i.id !== id));
    setStats((prev) => ({
      ...prev,
      total: prev.total - 1,
      remaining: prev.remaining - (prevItems.find((i) => i.id === id)?.checked ? 0 : 1),
      checked: prev.checked - (prevItems.find((i) => i.id === id)?.checked ? 1 : 0),
    }));
    showToast("🗑️ Borttagen");

    try {
      await fetch(`/api/pp/${id}`, { method: "DELETE" });
    } catch {
      setItems(prevItems);
      showToast("❌ Kunde inte ta bort");
    }
  }

  async function handleAddPP(sectionId: string) {
    const name = prompt("Namn pa ny bom/planka:");
    if (!name?.trim()) return;

    const section = sections.find((s) => s.id === sectionId);
    const sectionName = (section?.name ?? "").toLowerCase();

    // Determine type from section name
    let type = "pole";
    if (sectionName.includes("plank")) type = "plank";
    if (sectionName.includes("gate") || sectionName.includes("filler") || sectionName.includes("vatten")) type = "gate";

    // Determine length from section name
    let length = 2.5;
    if (sectionName.includes("3,20") || sectionName.includes("3.20") || sectionName.includes("3,2")) length = 3.2;
    else if (sectionName.includes("3,0") || sectionName.includes("3.0")) length = 3.0;

    const width = type === "plank" ? 0.2 : 0.1;

    const tempId = "temp_" + Date.now();
    const tempItem: PPItem = {
      id: tempId,
      name: name.trim(),
      sectionId,
      section: section ?? { id: sectionId, name: "", color: "#b8860b" },
      type,
      length,
      width,
      colorPattern: [],
      colorImage: "",
      checked: false,
      count: 0,
      bomId: "",
      note: "",
      sortOrder: 999,
    };

    setItems((prev) => [...prev, tempItem]);
    setStats((prev) => ({
      ...prev,
      total: prev.total + 1,
      remaining: prev.remaining + 1,
    }));

    try {
      const res = await fetch("/api/pp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), sectionId, type, length, width }),
      });
      const newItem = await res.json();
      setItems((prev) =>
        prev.map((i) => (i.id === tempId ? newItem : i))
      );
      showToast("➕ Tillagd");
    } catch {
      setItems((prev) => prev.filter((i) => i.id !== tempId));
      setStats((prev) => ({
        ...prev,
        total: prev.total - 1,
        remaining: prev.remaining - 1,
      }));
      showToast("❌ Kunde inte lagga till");
    }
  }

  // ─── Section handlers ────────────────────────────────────

  async function handleSectionRename(sectionId: string, name: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, name } : s))
    );
    showToast("✏️ Sektion omdopt");
    try {
      await fetch(`/api/sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    } catch {
      fetchData();
      showToast("❌ Kunde inte spara namn");
    }
  }

  async function handleSectionColorChange(sectionId: string, color: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, color } : s))
    );
    try {
      await fetch(`/api/sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color }),
      });
      showToast("🎨 Farg andrad");
    } catch {
      fetchData();
      showToast("❌ Kunde inte andra farg");
    }
  }

  async function handleSectionMoveUp(sectionId: string) {
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx <= 0) return;
    const newSections = [...sections];
    [newSections[idx - 1], newSections[idx]] = [newSections[idx], newSections[idx - 1]];
    setSections(newSections);
    try {
      await fetch("/api/sections/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionIds: newSections.map((s) => s.id) }),
      });
    } catch {
      fetchData();
      showToast("❌ Kunde inte flytta sektion");
    }
  }

  async function handleSectionMoveDown(sectionId: string) {
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx < 0 || idx >= sections.length - 1) return;
    const newSections = [...sections];
    [newSections[idx], newSections[idx + 1]] = [newSections[idx + 1], newSections[idx]];
    setSections(newSections);
    try {
      await fetch("/api/sections/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionIds: newSections.map((s) => s.id) }),
      });
    } catch {
      fetchData();
      showToast("❌ Kunde inte flytta sektion");
    }
  }

  async function handleSectionDelete(sectionId: string) {
    const prevSections = sections;
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    try {
      const res = await fetch(`/api/sections/${sectionId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      showToast("🗑️ Sektion borttagen");
    } catch (err) {
      setSections(prevSections);
      showToast(`❌ ${err instanceof Error ? err.message : "Kunde inte ta bort"}`);
    }
  }

  async function handleAddSection() {
    const name = prompt("Namn pa ny sektion:");
    if (!name?.trim()) return;
    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type: "pp" }),
      });
      const newSection = await res.json();
      setSections((prev) => [...prev, newSection]);
      showToast("➕ Sektion skapad");
    } catch {
      showToast("❌ Kunde inte skapa sektion");
    }
  }

  // ─── Filter & Search ─────────────────────────────────────

  const filteredItems = items.filter((i) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !i.name.toLowerCase().includes(q) &&
        !i.bomId.toLowerCase().includes(q) &&
        !i.note.toLowerCase().includes(q)
      )
        return false;
    }
    if (filter === "klara" && !i.checked) return false;
    if (filter === "kvar" && i.checked) return false;
    if (
      filter !== "alla" &&
      filter !== "klara" &&
      filter !== "kvar" &&
      i.sectionId !== filter
    )
      return false;
    return true;
  });

  const groupedItems = new Map<string, PPItem[]>();
  for (const item of filteredItems) {
    const key = item.sectionId;
    if (!groupedItems.has(key)) groupedItems.set(key, []);
    groupedItems.get(key)!.push(item);
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

  // Editor item
  const editorItem = editorItemId
    ? items.find((i) => i.id === editorItemId)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#b8860b] border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Stats bar */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { label: "Totalt", value: stats.total, color: "#b8860b" },
          { label: "Klara", value: stats.checked, color: "#27ae60" },
          { label: "Kvar", value: stats.remaining, color: "#e74c3c" },
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
          placeholder="🔍 Sok bommar & plankor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium transition-colors placeholder:text-gray-400 focus:border-[#b8860b] focus:outline-none"
        />
      </div>

      {/* Filter tabs */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {filterOptions.map((opt) => {
          const isActive = filter === opt.value;
          let activeClass = "border-[#b8860b] bg-[#b8860b] text-white";
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

      {/* Items grouped by section */}
      <div className="mt-4 space-y-1">
        {Array.from(groupedItems.entries()).map(
          ([sectionId, sectionItems]) => {
            const section = sections.find((s) => s.id === sectionId);
            if (!section) return null;

            const sectionIdx = sections.findIndex((s) => s.id === sectionId);

            return (
              <div key={sectionId}>
                <SectionHeader
                  id={sectionId}
                  name={section.name}
                  color={section.color}
                  fenceCount={sectionItems.length}
                  isFirst={sectionIdx === 0}
                  isLast={sectionIdx === sections.length - 1}
                  onRename={handleSectionRename}
                  onColorChange={handleSectionColorChange}
                  onMoveUp={handleSectionMoveUp}
                  onMoveDown={handleSectionMoveDown}
                  onDelete={handleSectionDelete}
                />

                {sectionItems.map((item) => (
                  <PPCard
                    key={item.id}
                    item={item}
                    sections={sections}
                    onToggleChecked={handleToggleChecked}
                    onNoteChange={handleNoteChange}
                    onCountChange={handleCountChange}
                    onBomIdChange={handleBomIdChange}
                    onMovePP={handleMovePP}
                    onDelete={handleDeletePP}
                    onEditColorPattern={(id) => setEditorItemId(id)}
                  />
                ))}

                {/* Add item to this section */}
                <button
                  onClick={() => handleAddPP(sectionId)}
                  className="mb-3 w-full rounded-lg border-2 border-dashed border-gray-200 py-1.5 text-xs font-semibold text-gray-400 hover:border-[#b8860b] hover:text-[#b8860b]"
                >
                  + Lagg till
                </button>
              </div>
            );
          }
        )}

        {filteredItems.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">
            Inga bommar eller plankor hittades
          </div>
        )}
      </div>

      {/* Add section button */}
      <button
        onClick={handleAddSection}
        className="mt-3 w-full rounded-lg border-2 border-dashed border-gray-300 py-2.5 text-sm font-semibold text-gray-400 hover:border-[#b8860b] hover:text-[#b8860b]"
      >
        + Lagg till sektion
      </button>

      {/* Color Pattern Editor */}
      {editorItem && (
        <ColorPatternEditor
          item={editorItem}
          onSave={handleColorPatternSave}
          onClose={() => setEditorItemId(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 animate-[fadeUp_0.3s_ease] rounded-[10px] bg-[#333] px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
          {toast}
        </div>
      )}
    </div>
  );
}
