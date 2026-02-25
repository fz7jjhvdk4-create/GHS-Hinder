"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FenceCard } from "./FenceCard";
import { ImageGallery } from "./ImageGallery";
import { SectionHeader } from "./SectionHeader";
import { cachedFetch, mutationFetch } from "@/lib/syncManager";
import type { GalleryImage } from "./ImageGallery";

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
  sortOrder: number;
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
  const deleteTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Fence | null>(null);

  // Gallery state
  const [galleryFenceId, setGalleryFenceId] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  // File input ref for gallery upload
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch data (network-first, falls back to IndexedDB cache)
  const fetchData = useCallback(async () => {
    try {
      const data = (await cachedFetch("/api/fences")) as {
        fences: Fence[];
        sections: Section[];
        stats: Stats;
      };
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

  // Re-fetch when coming back online
  useEffect(() => {
    const handler = () => fetchData();
    window.addEventListener("app-online", handler);
    return () => window.removeEventListener("app-online", handler);
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

    await mutationFetch(`/api/fences/${fenceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked: newChecked }),
    });
  }

  async function handleNotesChange(fenceId: string, notes: string) {
    setFences((prev) =>
      prev.map((f) => (f.id === fenceId ? { ...f, notes } : f))
    );
    await mutationFetch(`/api/fences/${fenceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  }

  async function handleFenceRename(fenceId: string, name: string) {
    setFences((prev) =>
      prev.map((f) => (f.id === fenceId ? { ...f, name } : f))
    );
    showToast("✏️ Hinder omdopt");

    await mutationFetch(`/api/fences/${fenceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  // ─── Component handlers ─────────────────────────────────

  async function handleComponentUpdate(
    compId: string,
    fenceId: string,
    data: Partial<FenceComponent>
  ) {
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
      if (data.count !== undefined) {
        setStats((s) => ({ ...s, wings: recalcWings(updated) }));
      }
      return updated;
    });

    await mutationFetch(`/api/components/${compId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async function handleComponentAdd(fenceId: string, type: string) {
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

    const res = await mutationFetch("/api/components", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fenceId, type }),
    });

    if (res.status === 202) {
      showToast(`➕ ${type} tillagd (synkas senare)`);
      return;
    }

    const newComp = await res.json();
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
  }

  async function handleComponentDelete(compId: string, fenceId: string) {
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

    await mutationFetch(`/api/components/${compId}`, { method: "DELETE" });
  }

  // ─── Image handlers ─────────────────────────────────────

  async function handleImageUpload(fenceId: string, imageData: string) {
    // Optimistic: add temp image
    const tempId = "temp_img_" + Date.now();
    const fence = fences.find((f) => f.id === fenceId);
    const isFirst = !fence?.images?.length;

    setFences((prev) =>
      prev.map((f) => {
        if (f.id !== fenceId) return f;
        return {
          ...f,
          images: [
            ...f.images,
            {
              id: tempId,
              imageUrl: imageData,
              caption: "",
              isPrimary: isFirst,
              sortOrder: f.images.length,
            },
          ],
        };
      })
    );

    const res = await mutationFetch("/api/images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fenceId, imageData }),
    });

    if (res.status === 202) {
      showToast("📷 Bild sparad (synkas senare)");
      return;
    }

    const newImage = await res.json();
    setFences((prev) =>
      prev.map((f) => {
        if (f.id !== fenceId) return f;
        return {
          ...f,
          images: f.images.map((img) =>
            img.id === tempId ? newImage : img
          ),
        };
      })
    );
    showToast("📷 Bild uppladdad");
  }

  async function handleImageDelete(imageId: string, fenceId: string) {
    const prevFences = fences;
    setFences((prev) =>
      prev.map((f) => {
        if (f.id !== fenceId) return f;
        const remaining = f.images.filter((img) => img.id !== imageId);
        // If deleted was primary and there are remaining, make the first one primary
        const deletedImg = f.images.find((img) => img.id === imageId);
        if (deletedImg?.isPrimary && remaining.length > 0) {
          remaining[0] = { ...remaining[0], isPrimary: true };
        }
        return { ...f, images: remaining };
      })
    );
    showToast("🗑️ Bild borttagen");

    await mutationFetch(`/api/images/${imageId}`, { method: "DELETE" });
  }

  async function handleImageSetPrimary(imageId: string, fenceId: string) {
    setFences((prev) =>
      prev.map((f) => {
        if (f.id !== fenceId) return f;
        return {
          ...f,
          images: f.images.map((img) => ({
            ...img,
            isPrimary: img.id === imageId,
          })),
        };
      })
    );
    showToast("⭐ Primarbild andrad");

    await mutationFetch(`/api/images/${imageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrimary: true }),
    });
  }

  async function handleImageCaptionChange(
    imageId: string,
    fenceId: string,
    caption: string
  ) {
    setFences((prev) =>
      prev.map((f) => {
        if (f.id !== fenceId) return f;
        return {
          ...f,
          images: f.images.map((img) =>
            img.id === imageId ? { ...img, caption } : img
          ),
        };
      })
    );

    await mutationFetch(`/api/images/${imageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption }),
    });
  }

  // Gallery open/close
  function handleOpenGallery(fenceId: string, imageIndex: number) {
    setGalleryFenceId(fenceId);
    setGalleryIndex(imageIndex);
  }

  function handleCloseGallery() {
    setGalleryFenceId(null);
  }

  // Handle gallery upload button (triggers file input from gallery)
  function handleGalleryUploadClick() {
    galleryFileInputRef.current?.click();
  }

  async function handleGalleryFileSelect(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file || !galleryFenceId) return;

    try {
      const compressed = await compressImageForGallery(file, 1200, 0.8);
      await handleImageUpload(galleryFenceId, compressed);
    } catch (err) {
      console.error("Failed to process image:", err);
    }
    // Reset
    if (galleryFileInputRef.current) galleryFileInputRef.current.value = "";
  }

  // ─── Section handlers ────────────────────────────────────

  async function handleSectionRename(sectionId: string, name: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, name } : s))
    );
    showToast("✏️ Sektion omdopt");

    await mutationFetch(`/api/sections/${sectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  async function handleSectionColorChange(sectionId: string, color: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, color } : s))
    );

    await mutationFetch(`/api/sections/${sectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    });
    showToast("🎨 Farg andrad");
  }

  async function handleSectionMoveUp(sectionId: string) {
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx <= 0) return;
    const newSections = [...sections];
    [newSections[idx - 1], newSections[idx]] = [newSections[idx], newSections[idx - 1]];
    setSections(newSections);

    await mutationFetch("/api/sections/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionIds: newSections.map((s) => s.id) }),
    });
  }

  async function handleSectionMoveDown(sectionId: string) {
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx < 0 || idx >= sections.length - 1) return;
    const newSections = [...sections];
    [newSections[idx], newSections[idx + 1]] = [newSections[idx + 1], newSections[idx]];
    setSections(newSections);

    await mutationFetch("/api/sections/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionIds: newSections.map((s) => s.id) }),
    });
  }

  async function handleSectionDelete(sectionId: string) {
    const prevSections = sections;
    setSections((prev) => prev.filter((s) => s.id !== sectionId));

    const res = await mutationFetch(`/api/sections/${sectionId}`, { method: "DELETE" });
    if (res.status === 202) {
      showToast("🗑️ Sektion borttagen (synkas senare)");
      return;
    }
    if (!res.ok) {
      const err = await res.json();
      setSections(prevSections);
      showToast(`❌ ${err.error || "Kunde inte ta bort"}`);
      return;
    }
    showToast("🗑️ Sektion borttagen");
  }

  async function handleAddSection() {
    const name = prompt("Namn pa ny sektion:");
    if (!name?.trim()) return;

    const res = await mutationFetch("/api/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), type: "fence" }),
    });

    if (res.status === 202) {
      // Queued offline — add temp section to UI
      const tempSection: Section = {
        id: "temp_section_" + Date.now(),
        name: name.trim(),
        color: "#2F5496",
        type: "fence",
        sortOrder: sections.length,
      };
      setSections((prev) => [...prev, tempSection]);
      showToast("➕ Sektion skapad (synkas senare)");
      return;
    }

    const newSection = await res.json();
    setSections((prev) => [...prev, newSection]);
    showToast("➕ Sektion skapad");
  }

  async function handleMoveFence(fenceId: string, newSectionId: string) {
    const fence = fences.find((f) => f.id === fenceId);
    if (!fence || fence.sectionId === newSectionId) return;

    const prevFences = fences;
    setFences((prev) =>
      prev.map((f) =>
        f.id === fenceId ? { ...f, sectionId: newSectionId } : f
      )
    );
    showToast("↔️ Hinder flyttat");

    await mutationFetch(`/api/fences/${fenceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId: newSectionId }),
    });
  }

  // ─── Create & Delete fence ─────────────────────────────

  async function handleAddFence(sectionId: string) {
    const name = prompt("Namn pa nytt hinder:");
    if (!name?.trim()) return;

    const tempId = "temp_fence_" + Date.now();
    const section = sections.find((s) => s.id === sectionId);
    const tempFence: Fence = {
      id: tempId,
      name: name.trim(),
      sectionId,
      section: section ?? { id: sectionId, name: "", color: "#2F5496", type: "fence", sortOrder: 0 },
      checked: false,
      notes: "",
      sortOrder: 999,
      images: [],
      components: [],
    };

    setFences((prev) => [...prev, tempFence]);
    setStats((prev) => ({
      ...prev,
      total: prev.total + 1,
      remaining: prev.remaining + 1,
    }));

    const res = await mutationFetch("/api/fences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), sectionId }),
    });

    if (res.status === 202) {
      showToast("➕ Hinder tillagt (synkas senare)");
      return;
    }

    const newFence = await res.json();
    setFences((prev) =>
      prev.map((f) => (f.id === tempId ? newFence : f))
    );
    showToast("➕ Hinder tillagt");
  }

  function handleDeleteFence(fenceId: string) {
    const fence = fences.find((f) => f.id === fenceId);
    if (!fence) return;

    // Cancel any previous pending delete
    if (deleteTimeout.current) {
      clearTimeout(deleteTimeout.current);
      // Execute the previous pending delete immediately
      if (pendingDelete) {
        mutationFetch(`/api/fences/${pendingDelete.id}`, { method: "DELETE" });
      }
    }

    // Remove from UI immediately
    setFences((prev) => prev.filter((f) => f.id !== fenceId));
    setStats((prev) => ({
      ...prev,
      total: prev.total - 1,
      checked: prev.checked - (fence.checked ? 1 : 0),
      remaining: prev.remaining - (fence.checked ? 0 : 1),
      wings: recalcWings(fences.filter((f) => f.id !== fenceId)),
    }));
    setPendingDelete(fence);
    showToast(""); // Clear first to allow re-render

    // Show undo toast for 5 seconds, then actually delete
    deleteTimeout.current = setTimeout(async () => {
      await mutationFetch(`/api/fences/${fenceId}`, { method: "DELETE" });
      setPendingDelete(null);
      deleteTimeout.current = null;
    }, 5000);
  }

  function handleUndoDelete() {
    if (!pendingDelete) return;
    if (deleteTimeout.current) {
      clearTimeout(deleteTimeout.current);
      deleteTimeout.current = null;
    }
    // Restore the fence
    setFences((prev) => [...prev, pendingDelete]);
    setStats((prev) => ({
      ...prev,
      total: prev.total + 1,
      checked: prev.checked + (pendingDelete.checked ? 1 : 0),
      remaining: prev.remaining + (pendingDelete.checked ? 0 : 1),
      wings: recalcWings([...fences, pendingDelete]),
    }));
    setPendingDelete(null);
    showToast("↩️ Aterstallen");
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

  // Gallery fence data
  const galleryFence = galleryFenceId
    ? fences.find((f) => f.id === galleryFenceId)
    : null;

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
          placeholder="🔍 Sok hinder..."
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
          ([sectionId, sectionFences], idx) => {
            const section = sections.find((s) => s.id === sectionId);
            if (!section) return null;

            const sectionIdx = sections.findIndex((s) => s.id === sectionId);

            return (
              <div key={sectionId}>
                <SectionHeader
                  id={sectionId}
                  name={section.name}
                  color={section.color}
                  fenceCount={sectionFences.length}
                  isFirst={sectionIdx === 0}
                  isLast={sectionIdx === sections.length - 1}
                  onRename={handleSectionRename}
                  onColorChange={handleSectionColorChange}
                  onMoveUp={handleSectionMoveUp}
                  onMoveDown={handleSectionMoveDown}
                  onDelete={handleSectionDelete}
                />

                {sectionFences.map((fence) => (
                  <FenceCard
                    key={fence.id}
                    fence={fence}
                    sections={sections}
                    onToggleChecked={handleToggleChecked}
                    onNotesChange={handleNotesChange}
                    onRename={handleFenceRename}
                    onComponentUpdate={handleComponentUpdate}
                    onComponentAdd={handleComponentAdd}
                    onComponentDelete={handleComponentDelete}
                    onImageUpload={handleImageUpload}
                    onImageDelete={handleImageDelete}
                    onImageSetPrimary={handleImageSetPrimary}
                    onImageCaptionChange={handleImageCaptionChange}
                    onOpenGallery={handleOpenGallery}
                    onMoveFence={handleMoveFence}
                    onDeleteFence={handleDeleteFence}
                  />
                ))}

                {/* Add fence to section */}
                <button
                  onClick={() => handleAddFence(sectionId)}
                  className="mb-3 w-full rounded-lg border-2 border-dashed border-gray-200 py-1.5 text-xs font-semibold text-gray-400 hover:border-[#2F5496] hover:text-[#2F5496]"
                >
                  + Lagg till hinder
                </button>
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

      {/* Add section button */}
      <button
        onClick={handleAddSection}
        className="mt-3 w-full rounded-lg border-2 border-dashed border-gray-300 py-2.5 text-sm font-semibold text-gray-400 hover:border-[#2F5496] hover:text-[#2F5496]"
      >
        + Lagg till sektion
      </button>

      {/* Image Gallery Modal */}
      {galleryFence && galleryFence.images.length > 0 && (
        <ImageGallery
          images={galleryFence.images as GalleryImage[]}
          fenceName={galleryFence.name}
          initialIndex={galleryIndex}
          onClose={handleCloseGallery}
          onSetPrimary={(imageId) =>
            handleImageSetPrimary(imageId, galleryFence.id)
          }
          onDelete={(imageId) =>
            handleImageDelete(imageId, galleryFence.id)
          }
          onCaptionChange={(imageId, caption) =>
            handleImageCaptionChange(imageId, galleryFence.id, caption)
          }
          onUpload={handleGalleryUploadClick}
        />
      )}

      {/* Hidden file input for gallery uploads */}
      <input
        ref={galleryFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleGalleryFileSelect}
        className="hidden"
      />

      {/* Undo delete toast */}
      {pendingDelete && (
        <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 animate-[fadeUp_0.3s_ease] rounded-[10px] bg-[#333] px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
          <span>🗑️ &quot;{pendingDelete.name}&quot; borttaget</span>
          <button
            onClick={handleUndoDelete}
            className="ml-3 rounded-md bg-white/20 px-3 py-1 text-xs font-bold text-white hover:bg-white/30"
          >
            Angra
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && !pendingDelete && (
        <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 animate-[fadeUp_0.3s_ease] rounded-[10px] bg-[#333] px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Image compression utility (for gallery upload) ──────

function compressImageForGallery(
  file: File,
  maxSize: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context failed"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
