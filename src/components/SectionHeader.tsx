"use client";

import { useState, useRef } from "react";

const SECTION_COLORS = [
  "#2F5496", "#1a3a6e", "#0a1628",
  "#27ae60", "#1e8a4c", "#16a085",
  "#e74c3c", "#c0392b", "#e67e22",
  "#b8860b", "#8e44ad", "#2c3e50",
];

interface SectionHeaderProps {
  id: string;
  name: string;
  color: string;
  fenceCount: number;
  isFirst: boolean;
  isLast: boolean;
  onRename: (id: string, name: string) => void;
  onColorChange: (id: string, color: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SectionHeader({
  id,
  name,
  color,
  fenceCount,
  isFirst,
  isLast,
  onRename,
  onColorChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: SectionHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [showMenu, setShowMenu] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleStartEdit() {
    setEditName(name);
    setEditing(true);
    setShowMenu(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSave() {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== name) {
      onRename(id, trimmed);
    }
    setEditing(false);
  }

  function handleDelete() {
    if (fenceCount > 0) {
      alert("Kan inte ta bort en sektion som innehaller hinder. Flytta hindren forst.");
      return;
    }
    if (confirm(`Ta bort sektionen "${name}"?`)) {
      onDelete(id);
    }
    setShowMenu(false);
  }

  return (
    <div className="mt-3 mb-1.5">
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-white"
        style={{ backgroundColor: color }}
      >
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setEditing(false);
            }}
            className="min-w-0 flex-1 rounded bg-white/20 px-2 py-0.5 text-sm font-bold text-white placeholder:text-white/50 focus:bg-white/30 focus:outline-none"
          />
        ) : (
          <span
            className="min-w-0 flex-1 cursor-pointer text-sm font-bold"
            onClick={handleStartEdit}
            title="Klicka for att redigera"
          >
            {name}
            <span className="ml-2 text-xs font-normal opacity-80">
              ({fenceCount})
            </span>
          </span>
        )}

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-1">
          {/* Move up */}
          {!isFirst && (
            <button
              onClick={() => onMoveUp(id)}
              className="rounded p-0.5 text-white/70 hover:bg-white/20 hover:text-white"
              title="Flytta upp"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
          )}

          {/* Move down */}
          {!isLast && (
            <button
              onClick={() => onMoveDown(id)}
              className="rounded p-0.5 text-white/70 hover:bg-white/20 hover:text-white"
              title="Flytta ner"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          )}

          {/* Menu toggle */}
          <button
            onClick={() => { setShowMenu(!showMenu); setShowColors(false); }}
            className="rounded p-0.5 text-white/70 hover:bg-white/20 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Dropdown menu */}
      {showMenu && (
        <div className="mx-1 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <button
            onClick={handleStartEdit}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Byt namn
          </button>
          <button
            onClick={() => { setShowColors(!showColors); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
            Byt farg
          </button>

          {showColors && (
            <div className="flex flex-wrap gap-1.5 border-t border-gray-100 px-3 py-2">
              {SECTION_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    onColorChange(id, c);
                    setShowColors(false);
                    setShowMenu(false);
                  }}
                  className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    c === color ? "border-gray-800 ring-2 ring-gray-300" : "border-white"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          )}

          <button
            onClick={handleDelete}
            className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Ta bort sektion
          </button>
        </div>
      )}
    </div>
  );
}
