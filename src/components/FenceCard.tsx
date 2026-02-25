"use client";

import { useState, useRef, useCallback } from "react";
import type { Fence, FenceComponent } from "./FenceList";
import type { GalleryImage } from "./ImageGallery";
import { compressImage } from "@/lib/imageUtils";

interface SectionOption {
  id: string;
  name: string;
  color: string;
}

interface FenceCardProps {
  fence: Fence;
  sections: SectionOption[];
  onToggleChecked: (id: string) => void;
  onNotesChange: (id: string, notes: string) => void;
  onRename: (id: string, name: string) => void;
  onComponentUpdate: (
    compId: string,
    fenceId: string,
    data: Partial<FenceComponent>
  ) => void;
  onComponentAdd: (fenceId: string, type: string) => void;
  onComponentDelete: (compId: string, fenceId: string) => void;
  onImageUpload: (fenceId: string, imageData: string) => void;
  onImageDelete: (imageId: string, fenceId: string) => void;
  onImageSetPrimary: (imageId: string, fenceId: string) => void;
  onImageCaptionChange: (imageId: string, fenceId: string, caption: string) => void;
  onOpenGallery: (fenceId: string, imageIndex: number) => void;
  onMoveFence: (fenceId: string, newSectionId: string) => void;
  onDeleteFence: (fenceId: string) => void;
}

const COMPONENT_TYPES = ["Wings", "Poles", "Fillers", "Planks"];

export function FenceCard({
  fence,
  sections,
  onToggleChecked,
  onNotesChange,
  onRename,
  onComponentUpdate,
  onComponentAdd,
  onComponentDelete,
  onImageUpload,
  onOpenGallery,
  onMoveFence,
  onDeleteFence,
}: FenceCardProps) {
  const [notesValue, setNotesValue] = useState(fence.notes);
  const [showAddComp, setShowAddComp] = useState(false);
  const [customType, setCustomType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(fence.name);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const compDebounceRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const primaryImage = fence.images?.find((img: GalleryImage) => img.isPrimary) || fence.images?.[0];
  const imageCount = fence.images?.length || 0;

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

  // Image upload handler - compress and convert to base64
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressed = await compressImage(file, 1200, 0.8);
      onImageUpload(fence.id, compressed);
    } catch (err) {
      console.error("Failed to process image:", err);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Commit rename
  function commitRename() {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== fence.name) {
      onRename(fence.id, trimmed);
    } else {
      setNameValue(fence.name);
    }
    setEditingName(false);
  }

  function startEditing() {
    setNameValue(fence.name);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
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
          {/* Image area */}
          <div className="relative shrink-0 max-[600px]:w-full">
            {primaryImage ? (
              <div className="relative">
                <img
                  src={primaryImage.imageUrl}
                  alt={fence.name}
                  onClick={() => onOpenGallery(fence.id, 0)}
                  className="block w-[170px] cursor-pointer rounded-lg object-cover max-[600px]:w-full max-[600px]:max-h-[200px]"
                />
                {/* Image count badge */}
                {imageCount > 1 && (
                  <div
                    className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[0.7em] font-bold text-white cursor-pointer"
                    onClick={() => onOpenGallery(fence.id, 0)}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    {imageCount}
                  </div>
                )}
                {/* Upload button overlay */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={uploading}
                  className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#2F5496]/80 text-white shadow hover:bg-[#2F5496] disabled:opacity-50"
                  title="Lagg till bild"
                >
                  {uploading ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )}
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex w-[170px] min-h-[100px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[#aac] bg-[#e8eef7] text-xs text-[#6688bb] hover:border-[#2F5496] hover:bg-[#dde5f3] max-[600px]:w-full"
              >
                {uploading ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-3 border-[#2F5496] border-t-transparent" />
                ) : (
                  <>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#6688bb]">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span>Lagg till bild</span>
                  </>
                )}
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
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
                      setNameValue(fence.name);
                      setEditingName(false);
                    }
                  }}
                  className={`flex-1 rounded border border-[#2F5496] bg-white px-1.5 py-0.5 text-base font-bold focus:outline-none ${
                    fence.checked ? "text-[#27ae60]" : "text-[#1a3a6e]"
                  }`}
                  autoFocus
                />
              ) : (
                <h3
                  onClick={startEditing}
                  className={`flex-1 cursor-pointer rounded px-1.5 py-0.5 text-base font-bold hover:bg-gray-50 ${
                    fence.checked ? "text-[#27ae60]" : "text-[#1a3a6e]"
                  }`}
                  title="Tryck for att byta namn"
                >
                  {fence.name}
                </h3>
              )}
              <button
                onClick={() => onDeleteFence(fence.id)}
                className="shrink-0 rounded px-1.5 py-0.5 text-xs text-gray-300 hover:bg-red-50 hover:text-red-500"
                title="Ta bort hinder"
              >
                🗑️
              </button>
            </div>

            {/* Move to section */}
            {sections.length > 1 && (
              <select
                value={fence.sectionId}
                onChange={(e) => onMoveFence(fence.id, e.target.value)}
                className="mb-1.5 w-full rounded border border-gray-200 bg-[#fafafa] px-2 py-1 text-[0.78em] text-gray-500 focus:border-[#2F5496] focus:outline-none"
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

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
                + Lagg till komponent
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
