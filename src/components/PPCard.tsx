"use client";

import { useState, useCallback, useRef } from "react";
import { ColorPatternSVG } from "./ColorPatternSVG";
import type { ColorSegment } from "./ColorPatternSVG";
import { isAdvancedPattern } from "@/lib/advancedPattern";

interface PPSection {
  id: string;
  name: string;
  color: string;
}

export interface PPItem {
  id: string;
  name: string;
  sectionId: string;
  section: PPSection;
  type: string;
  length: number;
  width: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  colorPattern: ColorSegment[] | any;
  colorImage: string;
  height: number;
  checked: boolean;
  count: number;
  bomId: string;
  note: string;
  sortOrder: number;
}

interface PPCardProps {
  item: PPItem;
  sections: PPSection[];
  onToggleChecked: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onRename: (id: string, name: string) => void;
  onCountChange: (id: string, count: number) => void;
  onBomIdChange: (id: string, bomId: string) => void;
  onMovePP: (id: string, newSectionId: string) => void;
  onDelete: (id: string) => void;
  onEditColorPattern: (id: string) => void;
}

export function PPCard({
  item,
  sections,
  onToggleChecked,
  onNoteChange,
  onRename,
  onCountChange,
  onBomIdChange,
  onMovePP,
  onDelete,
  onEditColorPattern,
}: PPCardProps) {
  const [noteValue, setNoteValue] = useState(item.note);
  const [countValue, setCountValue] = useState(item.count);
  const [bomIdValue, setBomIdValue] = useState(item.bomId);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(item.name);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const debounceRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  // Sync from parent when item changes
  if (noteValue !== item.note && !debounceRefs.current.has("note")) {
    setNoteValue(item.note);
  }
  if (countValue !== item.count && !debounceRefs.current.has("count")) {
    setCountValue(item.count);
  }
  if (bomIdValue !== item.bomId && !debounceRefs.current.has("bomId")) {
    setBomIdValue(item.bomId);
  }

  // Commit rename
  function commitRename() {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== item.name) {
      onRename(item.id, trimmed);
    } else {
      setNameValue(item.name);
    }
    setEditingName(false);
  }

  function startEditingName() {
    setNameValue(item.name);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  function debounce(key: string, fn: () => void) {
    const existing = debounceRefs.current.get(key);
    if (existing) clearTimeout(existing);
    const timeout = setTimeout(() => {
      debounceRefs.current.delete(key);
      fn();
    }, 800);
    debounceRefs.current.set(key, timeout);
  }

  const handleNoteInput = useCallback(
    (value: string) => {
      setNoteValue(value);
      debounce("note", () => onNoteChange(item.id, value));
    },
    [item.id, onNoteChange]
  );

  const handleCountInput = useCallback(
    (value: number) => {
      setCountValue(value);
      debounce("count", () => onCountChange(item.id, value));
    },
    [item.id, onCountChange]
  );

  const handleBomIdInput = useCallback(
    (value: string) => {
      setBomIdValue(value);
      debounce("bomId", () => onBomIdChange(item.id, value));
    },
    [item.id, onBomIdChange]
  );

  const hasColorPattern =
    isAdvancedPattern(item.colorPattern) ||
    (Array.isArray(item.colorPattern) && item.colorPattern.length > 0);
  const hasColorImage = !!item.colorImage;

  return (
    <div
      className="relative mb-2 overflow-hidden rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
      style={{
        borderLeft: `4px solid ${item.checked ? "#27ae60" : "#b8860b"}`,
      }}
    >
      <div className="flex gap-3 p-3">
        {/* Color preview */}
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          {hasColorPattern ? (
            <ColorPatternSVG
              colorPattern={item.colorPattern}
              type={item.type}
              length={item.length}
              width={item.width}
              height={item.height}
              maxWidth={140}
              onClick={() => onEditColorPattern(item.id)}
              className="hover:opacity-80"
            />
          ) : hasColorImage ? (
            <img
              src={item.colorImage}
              alt={item.name}
              className="max-h-[40px] w-[140px] cursor-pointer rounded object-contain hover:opacity-80"
              onClick={() => onEditColorPattern(item.id)}
            />
          ) : (
            <button
              onClick={() => onEditColorPattern(item.id)}
              className="flex h-[28px] w-[140px] items-center justify-center rounded border-2 border-dashed border-gray-300 text-xs text-gray-400 hover:border-[#b8860b] hover:text-[#b8860b]"
            >
              + Fargmonster
            </button>
          )}
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {/* Title row */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleChecked(item.id)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs transition-colors"
              style={{
                borderColor: item.checked ? "#27ae60" : "#d1d5db",
                backgroundColor: item.checked ? "#27ae60" : "transparent",
                color: item.checked ? "white" : "transparent",
              }}
            >
              {item.checked ? "✓" : ""}
            </button>
            {editingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") {
                    setNameValue(item.name);
                    setEditingName(false);
                  }
                }}
                className="flex-1 rounded border border-[#b8860b] bg-white px-1.5 py-0.5 text-sm font-bold text-gray-800 focus:outline-none"
                autoFocus
              />
            ) : (
              <span
                onClick={startEditingName}
                className={`cursor-pointer rounded px-1.5 py-0.5 text-sm font-bold hover:bg-gray-50 ${item.checked ? "text-gray-400 line-through" : "text-gray-800"}`}
                title="Tryck for att byta namn"
              >
                {item.name}
              </span>
            )}
          </div>

          {/* Count + BOM row */}
          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1 font-medium text-gray-500">
              Antal:
              <input
                type="number"
                value={countValue}
                onChange={(e) => handleCountInput(parseInt(e.target.value) || 0)}
                className="w-14 rounded border border-gray-200 px-2 py-1 text-center font-semibold text-gray-800 focus:border-[#b8860b] focus:outline-none"
                min={0}
              />
            </label>
            <label className="flex items-center gap-1 font-medium text-gray-500">
              BOM:
              <input
                type="text"
                value={bomIdValue}
                onChange={(e) => handleBomIdInput(e.target.value)}
                placeholder="—"
                className="w-16 rounded border border-gray-200 px-2 py-1 text-center font-semibold text-gray-800 focus:border-[#b8860b] focus:outline-none"
              />
            </label>
          </div>

          {/* Section dropdown + delete */}
          <div className="flex items-center gap-2">
            {sections.length > 1 && (
              <select
                value={item.sectionId}
                onChange={(e) => onMovePP(item.id, e.target.value)}
                className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 focus:border-[#b8860b] focus:outline-none"
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => {
                if (confirm(`Ta bort "${item.name}"?`)) {
                  onDelete(item.id);
                }
              }}
              className="rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-red-50 hover:text-red-500"
              title="Ta bort"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="border-t border-gray-100 px-3 pb-2 pt-1.5">
        <textarea
          value={noteValue}
          onChange={(e) => handleNoteInput(e.target.value)}
          placeholder="Anteckningar..."
          rows={1}
          className="w-full resize-y rounded border-0 bg-transparent px-0 text-xs text-gray-600 placeholder:text-gray-300 focus:outline-none"
        />
      </div>
    </div>
  );
}
