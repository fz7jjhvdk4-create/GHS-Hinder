"use client";

import { useState, useRef, useCallback } from "react";
import type { Fence, FenceComponent } from "./FenceList";

interface FenceCardProps {
  fence: Fence;
  onToggleChecked: (id: string) => void;
  onNotesChange: (id: string, notes: string) => void;
  onComponentUpdate: (
    compId: string,
    fenceId: string,
    data: Partial<FenceComponent>
  ) => void;
  onComponentAdd: (fenceId: string, type: string) => void;
  onComponentDelete: (compId: string, fenceId: string) => void;
}

const COMPONENT_TYPES = ["Wings", "Poles", "Fillers", "Planks"];

export function FenceCard({
  fence,
  onToggleChecked,
  onNotesChange,
  onComponentUpdate,
  onComponentAdd,
  onComponentDelete,
}: FenceCardProps) {
  const [notesValue, setNotesValue] = useState(fence.notes);
  const [imgExpanded, setImgExpanded] = useState(false);
  const [showAddComp, setShowAddComp] = useState(false);
  const [customType, setCustomType] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const compDebounceRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

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

  // Debounced component field save
  function handleCompFieldChange(
    compId: string,
    field: keyof FenceComponent,
    value: string | number
  ) {
    const existing = compDebounceRefs.current.get(compId + field);
    if (existing) clearTimeout(existing);

    const timeout = setTimeout(() => {
      onComponentUpdate(compId, fence.id, { [field]: value });
    }, 600);
    compDebounceRefs.current.set(compId + field, timeout);
  }

  function handleAddComponent(type: string) {
    if (!type.trim()) return;
    onComponentAdd(fence.id, type.trim());
    setShowAddComp(false);
    setCustomType("");
  }

  // Which types are already used
  const usedTypes = new Set(fence.components.map((c) => c.type));
  const availableTypes = COMPONENT_TYPES.filter((t) => !usedTypes.has(t));

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
              <h3
                className={`text-base font-bold ${
                  fence.checked ? "text-[#27ae60]" : "text-[#1a3a6e]"
                }`}
              >
                {fence.name}
              </h3>
            </div>

            {/* Editable components table */}
            {fence.components.length > 0 && (
              <table className="w-full border-collapse text-[0.86em]">
                <tbody>
                  {fence.components.map((comp) => (
                    <ComponentRow
                      key={comp.id}
                      comp={comp}
                      onChange={(field, value) =>
                        handleCompFieldChange(comp.id, field, value)
                      }
                      onDelete={() =>
                        onComponentDelete(comp.id, fence.id)
                      }
                    />
                  ))}
                </tbody>
              </table>
            )}

            {/* Add component */}
            {!showAddComp ? (
              <button
                onClick={() => setShowAddComp(true)}
                className="mt-1.5 rounded border border-dashed border-[#2F5496] bg-transparent px-2 py-0.5 text-[0.78em] text-[#2F5496] hover:bg-[#2F5496]/5"
              >
                + Lägg till komponent
              </button>
            ) : (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {availableTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleAddComponent(type)}
                    className="rounded-md bg-[#2F5496] px-2.5 py-1 text-[0.78em] font-medium text-white hover:bg-[#1a3a6e]"
                  >
                    {type}
                  </button>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddComponent(customType);
                    }}
                    placeholder="Annan typ..."
                    className="w-24 rounded-md border border-gray-300 px-2 py-1 text-[0.78em] focus:border-[#2F5496] focus:outline-none"
                  />
                  {customType && (
                    <button
                      onClick={() => handleAddComponent(customType)}
                      className="rounded-md bg-[#27ae60] px-2 py-1 text-[0.78em] font-medium text-white"
                    >
                      ✓
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowAddComp(false);
                    setCustomType("");
                  }}
                  className="text-[0.78em] text-gray-400 hover:text-gray-600"
                >
                  Avbryt
                </button>
              </div>
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

// ─── ComponentRow ─────────────────────────────────────────

interface ComponentRowProps {
  comp: FenceComponent;
  onChange: (field: keyof FenceComponent, value: string | number) => void;
  onDelete: () => void;
}

function ComponentRow({ comp, onChange, onDelete }: ComponentRowProps) {
  const [count, setCount] = useState(String(comp.count || ""));
  const [desc, setDesc] = useState(comp.description);
  const [bomId, setBomId] = useState(comp.bomId);

  return (
    <tr className="group">
      <td className="w-[75px] border-b border-gray-100 px-1.5 py-1 font-semibold text-gray-500">
        {comp.type}
      </td>
      <td className="w-[50px] border-b border-gray-100 px-1 py-1">
        <input
          type="text"
          inputMode="numeric"
          value={count}
          onChange={(e) => {
            setCount(e.target.value);
            const num = parseInt(e.target.value) || 0;
            onChange("count", num);
          }}
          className="w-full rounded border border-gray-200 bg-[#fafafa] px-1.5 py-0.5 text-center text-[0.95em] text-gray-700 focus:border-[#2F5496] focus:bg-white focus:outline-none"
        />
      </td>
      <td className="border-b border-gray-100 px-1 py-1">
        <input
          type="text"
          value={desc}
          onChange={(e) => {
            setDesc(e.target.value);
            onChange("description", e.target.value);
          }}
          placeholder="Beskrivning"
          className="w-full rounded border border-gray-200 bg-[#fafafa] px-1.5 py-0.5 text-[0.95em] text-gray-600 placeholder:text-gray-300 focus:border-[#2F5496] focus:bg-white focus:outline-none"
        />
      </td>
      <td className="w-[60px] border-b border-gray-100 px-1 py-1">
        <input
          type="text"
          value={bomId}
          onChange={(e) => {
            setBomId(e.target.value);
            onChange("bomId", e.target.value);
          }}
          placeholder="BOM"
          className="w-full rounded border border-gray-200 bg-[#fafafa] px-1.5 py-0.5 text-right text-[0.85em] text-gray-400 placeholder:text-gray-300 focus:border-[#2F5496] focus:bg-white focus:outline-none"
        />
      </td>
      <td className="w-[24px] border-b border-gray-100 py-1">
        <button
          onClick={onDelete}
          className="flex h-5 w-5 items-center justify-center rounded-full text-[0.7em] text-red-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
          title="Ta bort"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}
