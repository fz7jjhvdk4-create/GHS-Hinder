"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ColorPatternSVG } from "./ColorPatternSVG";
import type { ColorSegment } from "./ColorPatternSVG";
import { compressImage } from "@/lib/imageUtils";
import { isAdvancedPattern, DEFAULT_ADVANCED_PATTERN } from "@/lib/advancedPattern";
import type { AdvancedColorPattern } from "@/lib/advancedPattern";
import { AdvancedPatternEditorPanel } from "./AdvancedPatternEditorPanel";

interface EditorItem {
  id: string;
  name: string;
  type: string;
  length: number;
  width: number;
  height: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  colorPattern: ColorSegment[] | any;
  colorImage: string;
}

interface ColorPatternEditorProps {
  item: EditorItem;
  onSave: (
    id: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    colorPattern: ColorSegment[] | AdvancedColorPattern | any,
    colorImage: string,
    height?: number
  ) => void;
  onClose: () => void;
}

type EditorMode = "stripe" | "photo" | "advanced";

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

const MIN_SEGMENT_PERCENT = 2; // minimum 2% per segment

export function ColorPatternEditor({
  item,
  onSave,
  onClose,
}: ColorPatternEditorProps) {
  const hasAdvanced = isAdvancedPattern(item.colorPattern);
  const hasColorPattern =
    !hasAdvanced && Array.isArray(item.colorPattern) && item.colorPattern.length > 0;
  const hasColorImage = !!item.colorImage;
  const canShowAdvanced = item.type !== "pole";

  const defaultMode: EditorMode = hasAdvanced
    ? "advanced"
    : hasColorImage && !hasColorPattern
      ? "photo"
      : "stripe";

  const [mode, setMode] = useState<EditorMode>(defaultMode);

  // Advanced pattern state
  const [advancedPattern, setAdvancedPattern] = useState<AdvancedColorPattern>(
    hasAdvanced ? (item.colorPattern as AdvancedColorPattern) : { ...DEFAULT_ADVANCED_PATTERN }
  );

  // ── Stripe state ──
  const initialSegments =
    Array.isArray(item.colorPattern) && item.colorPattern.length > 0
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
    const clamped = Math.max(1, Math.min(20, count));
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

  function makeEqual() {
    const count = segments.length;
    const pct = Math.round((100 / count) * 100) / 100;
    setSegments(
      segments.map((s, i) => ({
        ...s,
        percent: i === count - 1 ? 100 - pct * (count - 1) : pct,
      }))
    );
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
    } else if (mode === "advanced") {
      onSave(item.id, advancedPattern, "", advancedPattern.height);
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
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
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
          {canShowAdvanced && (
            <button
              onClick={() => setMode("advanced")}
              className={`flex-1 rounded-md py-2 text-xs font-bold transition-colors ${
                mode === "advanced"
                  ? "bg-white text-[#b8860b] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              ✦ Avancerad
            </button>
          )}
        </div>

        {/* ═══ STRIPE TAB ═══ */}
        {mode === "stripe" && (
          <div>
            {/* Live preview */}
            <div className="mb-2 flex items-center justify-center rounded-lg bg-gray-50 p-4">
              <ColorPatternSVG
                colorPattern={segments}
                type={item.type}
                length={item.length}
                width={item.width}
                maxWidth={420}
              />
            </div>

            {/* Interactive resize bar */}
            {segments.length > 1 && (
              <SegmentResizer
                segments={segments}
                onSegmentsChange={setSegments}
                activeIdx={activeIdx}
                onActiveChange={setActiveIdx}
              />
            )}

            {/* Segment count + equal button */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-500">
                  Antal falt
                </label>
                <div className="flex items-center rounded-lg border border-gray-200">
                  <button
                    onClick={() => setSegmentCount(segments.length - 1)}
                    disabled={segments.length <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-l-lg text-sm font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="flex h-8 w-10 items-center justify-center border-x border-gray-200 bg-gray-50 text-xs font-bold text-[#b8860b]">
                    {segments.length}
                  </span>
                  <button
                    onClick={() => setSegmentCount(segments.length + 1)}
                    disabled={segments.length >= 20}
                    className="flex h-8 w-8 items-center justify-center rounded-r-lg text-sm font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>
              {segments.length > 1 && (
                <button
                  onClick={makeEqual}
                  className="rounded-md bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-500 hover:bg-gray-200"
                >
                  ↔ Lika stora
                </button>
              )}
            </div>

            {/* Segment colors */}
            <div className="mb-3 max-h-[200px] space-y-1.5 overflow-y-auto">
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
                  <span className="w-9 text-right text-[10px] font-medium text-gray-400">
                    {Math.round(seg.percent)}%
                  </span>
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {photoPreview ? (
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

        {/* ═══ ADVANCED TAB ═══ */}
        {mode === "advanced" && (
          <AdvancedPatternEditorPanel
            pattern={advancedPattern}
            onChange={setAdvancedPattern}
            itemType={item.type}
            itemLength={item.length}
            itemWidth={item.width}
          />
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

// ─── Interactive Segment Resizer ──────────────────────────

interface SegmentResizerProps {
  segments: ColorSegment[];
  onSegmentsChange: (segments: ColorSegment[]) => void;
  activeIdx: number;
  onActiveChange: (idx: number) => void;
}

function SegmentResizer({
  segments,
  onSegmentsChange,
  activeIdx,
  onActiveChange,
}: SegmentResizerProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    dividerIdx: number;
    startX: number;
    startPercents: number[];
  } | null>(null);

  // Get cumulative positions as pixel offsets
  function getPixelX(event: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent): number {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    const clientX =
      "touches" in event
        ? (event as TouchEvent).touches[0]?.clientX ?? 0
        : (event as MouseEvent).clientX;
    return Math.max(0, Math.min(clientX - rect.left, rect.width));
  }

  const handleDragStart = useCallback(
    (dividerIdx: number, e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        dividerIdx,
        startX: getPixelX(e),
        startPercents: segments.map((s) => s.percent),
      };

      function handleMove(ev: TouchEvent | MouseEvent) {
        if (!dragRef.current || !barRef.current) return;
        const barWidth = barRef.current.getBoundingClientRect().width;
        const currentX = getPixelX(ev);
        const deltaX = currentX - dragRef.current.startX;
        const deltaPct = (deltaX / barWidth) * 100;

        const { dividerIdx: di, startPercents } = dragRef.current;
        const leftPct = startPercents[di] + deltaPct;
        const rightPct = startPercents[di + 1] - deltaPct;

        // Enforce minimums
        if (leftPct < MIN_SEGMENT_PERCENT || rightPct < MIN_SEGMENT_PERCENT)
          return;

        const newSegments = segments.map((s, i) => {
          if (i === di) return { ...s, percent: Math.round(leftPct * 10) / 10 };
          if (i === di + 1)
            return { ...s, percent: Math.round(rightPct * 10) / 10 };
          return s;
        });
        onSegmentsChange(newSegments);
      }

      function handleEnd() {
        dragRef.current = null;
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleEnd);
        window.removeEventListener("touchmove", handleMove);
        window.removeEventListener("touchend", handleEnd);
      }

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", handleMove, { passive: false });
      window.addEventListener("touchend", handleEnd);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [segments, onSegmentsChange]
  );

  // Compute cumulative % for divider positions
  const cumulativePercents: number[] = [];
  let cum = 0;
  for (const seg of segments) {
    cum += seg.percent;
    cumulativePercents.push(cum);
  }

  return (
    <div className="mb-3">
      <label className="mb-1.5 block text-xs font-semibold text-gray-500">
        Dra i handtagen for att andra storlek
      </label>
      <div
        ref={barRef}
        className="relative h-14 w-full overflow-hidden rounded-lg border border-gray-200"
        style={{ touchAction: "none" }}
      >
        {/* Colored segments */}
        {segments.map((seg, i) => {
          const left =
            i === 0 ? 0 : cumulativePercents[i - 1];
          return (
            <div
              key={i}
              className={`absolute inset-y-0 transition-opacity ${activeIdx === i ? "" : "opacity-80"}`}
              style={{
                left: `${left}%`,
                width: `${seg.percent}%`,
                backgroundColor: seg.color,
                borderRight:
                  i < segments.length - 1
                    ? "1px solid rgba(0,0,0,0.15)"
                    : "none",
              }}
              onClick={() => onActiveChange(i)}
            >
              {/* Percent label inside segment */}
              {seg.percent > 12 && (
                <span
                  className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
                  style={{
                    color: isLightColor(seg.color) ? "#333" : "#fff",
                    textShadow: isLightColor(seg.color)
                      ? "none"
                      : "0 1px 2px rgba(0,0,0,0.4)",
                  }}
                >
                  {Math.round(seg.percent)}%
                </span>
              )}
            </div>
          );
        })}

        {/* Drag handles between segments */}
        {segments.slice(0, -1).map((_, i) => (
          <div
            key={`handle-${i}`}
            className="absolute inset-y-0 z-10 flex w-6 -translate-x-1/2 cursor-col-resize items-center justify-center"
            style={{ left: `${cumulativePercents[i]}%` }}
            onMouseDown={(e) => handleDragStart(i, e)}
            onTouchStart={(e) => handleDragStart(i, e)}
          >
            <div className="h-8 w-1.5 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.2)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // Relative luminance approximation
  return r * 0.299 + g * 0.587 + b * 0.114 > 160;
}
