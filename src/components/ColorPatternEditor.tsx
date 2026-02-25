"use client";

import { useState, useEffect, useRef } from "react";
import { ColorPatternSVG } from "./ColorPatternSVG";
import type { ColorSegment } from "./ColorPatternSVG";
import { compressImage } from "@/lib/imageUtils";

interface EditorItem {
  id: string;
  name: string;
  type: string;
  length: number;
  width: number;
  colorPattern: ColorSegment[];
  colorImage: string;
}

interface ColorPatternEditorProps {
  item: EditorItem;
  onSave: (id: string, colorPattern: ColorSegment[], colorImage: string) => void;
  onClose: () => void;
}

type EditorMode = "stripe" | "photo";

const PRESET_COLORS = [
  { color: "#ffffff", label: "Vit" },
  { color: "#e74c3c", label: "Rod" },
  { color: "#2F5496", label: "Bla" },
  { color: "#27ae60", label: "Gron" },
  { color: "#b8860b", label: "Guld" },
  { color: "#000000", label: "Svart" },
  { color: "#8e44ad", label: "Lila" },
  { color: "#e67e22", label: "Orange" },
  { color: "#8B4513", label: "Brun" },
  { color: "#ff69b4", label: "Rosa" },
  { color: "#f1c40f", label: "Gul" },
  { color: "#1abc9c", label: "Turkos" },
];

export function ColorPatternEditor({
  item,
  onSave,
  onClose,
}: ColorPatternEditorProps) {
  const hasColorPattern =
    Array.isArray(item.colorPattern) && item.colorPattern.length > 0;
  const hasColorImage = !!item.colorImage;

  // Default to "photo" if item has image but no pattern
  const defaultMode: EditorMode =
    hasColorImage && !hasColorPattern ? "photo" : "stripe";

  const [mode, setMode] = useState<EditorMode>(defaultMode);

  // ── Stripe state ──
  const initialSegments =
    item.colorPattern.length > 0
      ? item.colorPattern
      : [
          { color: "#e74c3c", percent: 50 },
          { color: "#ffffff", percent: 50 },
        ];

  const [segments, setSegments] = useState<ColorSegment[]>(initialSegments);
  const [activeIdx, setActiveIdx] = useState(0);

  // ── Photo state ──
  const [photoPreview, setPhotoPreview] = useState<string>(
    item.colorImage || ""
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // ── Stripe handlers ──
  function setSegmentCount(count: number) {
    const clamped = Math.max(1, Math.min(8, count));
    const pct = Math.round((100 / clamped) * 100) / 100;
    const newSegments: ColorSegment[] = [];
    for (let i = 0; i < clamped; i++) {
      newSegments.push({
        color: segments[i]?.color ?? "#e5e7eb",
        percent: i === clamped - 1 ? 100 - pct * (clamped - 1) : pct,
      });
    }
    setSegments(newSegments);
    if (activeIdx >= clamped) setActiveIdx(clamped - 1);
  }

  function setColor(idx: number, color: string) {
    setSegments((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, color } : s))
    );
  }

  // ── Photo handlers ──
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressed = await compressImage(file, 800, 0.85);
      setPhotoPreview(compressed);
    } catch {
      // Silently fail
    } finally {
      setUploading(false);
    }
  }

  function handleRemovePhoto() {
    setPhotoPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Save ──
  function handleSave() {
    if (mode === "stripe") {
      onSave(item.id, segments, "");
    } else {
      onSave(item.id, [], photoPreview);
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">
            Fargmonster — {item.name}
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="mb-4 flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setMode("stripe")}
            className={`flex-1 rounded-md py-2 text-xs font-bold transition-colors ${
              mode === "stripe"
                ? "bg-white text-[#b8860b] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            🎨 Rander
          </button>
          <button
            onClick={() => setMode("photo")}
            className={`flex-1 rounded-md py-2 text-xs font-bold transition-colors ${
              mode === "photo"
                ? "bg-white text-[#b8860b] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            📷 Foto
          </button>
        </div>

        {/* ═══ STRIPE TAB ═══ */}
        {mode === "stripe" && (
          <div>
            {/* Live preview */}
            <div className="mb-4 flex items-center justify-center rounded-lg bg-gray-50 p-4">
              <ColorPatternSVG
                colorPattern={segments}
                type={item.type}
                length={item.length}
                width={item.width}
                maxWidth={260}
              />
            </div>

            {/* Segment count */}
            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                Antal falt
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSegmentCount(n)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                      segments.length === n
                        ? "bg-[#b8860b] text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Segment colors */}
            <div className="mb-3 max-h-[160px] space-y-2 overflow-y-auto">
              {segments.map((seg, i) => (
                <div
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                    activeIdx === i
                      ? "bg-amber-50 ring-1 ring-[#b8860b]/30"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <span className="w-5 text-xs font-semibold text-gray-400">
                    {i + 1}
                  </span>
                  <input
                    type="color"
                    value={seg.color}
                    onChange={(e) => setColor(i, e.target.value)}
                    className="h-7 w-10 cursor-pointer rounded border border-gray-200"
                  />
                  <div
                    className="h-5 flex-1 rounded"
                    style={{ backgroundColor: seg.color }}
                  />
                </div>
              ))}
            </div>

            {/* Quick color palette */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                Snabbfarger (for falt {activeIdx + 1})
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.color}
                    onClick={() => setColor(activeIdx, c.color)}
                    className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c.color,
                      borderColor:
                        c.color === "#ffffff" ? "#d1d5db" : "transparent",
                    }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ PHOTO TAB ═══ */}
        {mode === "photo" && (
          <div>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {photoPreview ? (
              /* Photo preview */
              <div className="mb-4">
                <div className="flex items-center justify-center rounded-lg bg-gray-50 p-3">
                  <img
                    src={photoPreview}
                    alt={item.name}
                    className="max-h-[120px] max-w-full rounded object-contain"
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                  >
                    📷 Byt bild
                  </button>
                  <button
                    onClick={handleRemovePhoto}
                    className="rounded-lg border border-red-200 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50"
                  >
                    Ta bort
                  </button>
                </div>
              </div>
            ) : (
              /* Upload area */
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mb-4 flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-10 text-gray-400 transition-colors hover:border-[#b8860b] hover:text-[#b8860b]"
              >
                {uploading ? (
                  <>
                    <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#b8860b] border-t-transparent" />
                    <span className="text-xs font-semibold">Laddar...</span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl">📷</span>
                    <span className="text-xs font-semibold">
                      Ladda upp eller ta foto
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Tryck for att valja bild
                    </span>
                  </>
                )}
              </button>
            )}

            <p className="mb-4 rounded-lg bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-700">
              💡 Anvand foto for komplexa monster som Nordiska flaggor, ringar
              eller speciella designer. Fotot visas som miniatyrbild pa kortet.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-50"
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={mode === "photo" && !photoPreview}
            className="flex-1 rounded-lg bg-[#b8860b] py-2.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40"
          >
            Spara
          </button>
        </div>
      </div>
    </div>
  );
}
