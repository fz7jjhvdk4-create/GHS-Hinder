"use client";

import { useState, useRef, useCallback } from "react";
import type { Fence } from "./FenceList";

interface FenceCardProps {
  fence: Fence;
  onToggleChecked: (id: string) => void;
  onNotesChange: (id: string, notes: string) => void;
}

export function FenceCard({
  fence,
  onToggleChecked,
  onNotesChange,
}: FenceCardProps) {
  const [notesValue, setNotesValue] = useState(fence.notes);
  const [imgExpanded, setImgExpanded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const primaryImage = fence.images?.[0]?.imageUrl;

  // Debounced notes save
  const handleNotesInput = useCallback(
    (value: string) => {
      setNotesValue(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onNotesChange(fence.id, value);
      }, 800);
    },
    [fence.id, onNotesChange]
  );

  return (
    <>
      <div
        className={`my-2 overflow-hidden rounded-xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.06)] transition-colors ${
          fence.checked
            ? "border-l-[5px] border-l-[#27ae60] bg-[#f6fdf8]"
            : "border-l-[5px] border-l-[#2F5496]"
        }`}
      >
        {/* Top: Image + Info */}
        <div className="flex items-start gap-3 p-3 max-[600px]:flex-col">
          {/* Image */}
          <div className="relative shrink-0 max-[600px]:w-full">
            {primaryImage ? (
              <img
                src={primaryImage}
                alt={fence.name}
                onClick={() => setImgExpanded(true)}
                className="block w-[170px] cursor-pointer rounded-lg object-cover max-[600px]:w-full max-[600px]:max-h-[200px]"
              />
            ) : (
              <div className="flex w-[170px] min-h-[100px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[#aac] bg-[#e8eef7] text-xs text-[#6688bb] max-[600px]:w-full">
                <span className="text-2xl">📷</span>
                <span>Ingen bild</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            {/* Title row */}
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              {/* Check button */}
              <button
                onClick={() => onToggleChecked(fence.id)}
                className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-2 text-sm transition-colors ${
                  fence.checked
                    ? "border-[#27ae60] bg-[#27ae60] text-white"
                    : "border-gray-300 bg-white hover:border-[#27ae60]"
                }`}
              >
                {fence.checked ? "✓" : ""}
              </button>

              {/* Name */}
              <h3
                className={`text-base font-bold ${
                  fence.checked ? "text-[#27ae60]" : "text-[#1a3a6e]"
                }`}
              >
                {fence.name}
              </h3>
            </div>

            {/* Components table */}
            {fence.components.length > 0 && (
              <table className="w-full border-collapse text-[0.86em]">
                <tbody>
                  {fence.components.map((comp) => (
                    <tr key={comp.id}>
                      <td className="w-[85px] border-b border-gray-100 px-1.5 py-1 font-semibold text-gray-500">
                        {comp.type}
                      </td>
                      <td className="border-b border-gray-100 px-1.5 py-1 text-gray-700">
                        {comp.count > 0 ? comp.count : "—"}
                      </td>
                      {comp.bomId && (
                        <td className="border-b border-gray-100 px-1.5 py-1 text-right text-xs text-gray-400">
                          {comp.bomId}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Notes row */}
        <div className="px-3 pb-2.5">
          <textarea
            value={notesValue}
            onChange={(e) => handleNotesInput(e.target.value)}
            placeholder="Anteckningar..."
            rows={1}
            className="w-full resize-y rounded-md border border-dashed border-gray-300 bg-transparent px-2.5 py-1.5 font-[inherit] text-[0.83em] text-gray-600 transition-colors placeholder:text-gray-300 focus:border-solid focus:border-[#2F5496] focus:outline-none"
          />
        </div>
      </div>

      {/* Image lightbox */}
      {imgExpanded && primaryImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setImgExpanded(false)}
        >
          <img
            src={primaryImage}
            alt={fence.name}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
          />
          <button
            onClick={() => setImgExpanded(false)}
            className="absolute right-4 top-4 rounded-full bg-white/20 px-3 py-1 text-lg text-white hover:bg-white/30"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
