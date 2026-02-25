"use client";

import { useState, useEffect } from "react";
import { ColorPatternSVG } from "./ColorPatternSVG";
import type { ColorSegment } from "./ColorPatternSVG";

interface EditorItem {
  id: string;
  name: string;
  type: string;
  length: number;
  width: number;
  colorPattern: ColorSegment[];
}

interface ColorPatternEditorProps {
  item: EditorItem;
  onSave: (id: string, colorPattern: ColorSegment[]) => void;
  onClose: () => void;
}

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
  const initialSegments =
    item.colorPattern.length > 0
      ? item.colorPattern
      : [{ color: "#e74c3c", percent: 50 }, { color: "#ffffff", percent: 50 }];

  const [segments, setSegments] = useState<ColorSegment[]>(initialSegments);
  const [activeIdx, setActiveIdx] = useState(0);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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

  function handleSave() {
    onSave(item.id, segments);
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
        <div className="mb-4 flex items-center justify-between">
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
        <div className="mb-3 space-y-2">
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
              <span className="text-[10px] font-medium text-gray-400">
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
            className="flex-1 rounded-lg bg-[#b8860b] py-2.5 text-xs font-bold text-white hover:opacity-90"
          >
            Spara
          </button>
        </div>
      </div>
    </div>
  );
}
