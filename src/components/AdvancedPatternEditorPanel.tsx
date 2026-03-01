"use client";

import { useState, useRef } from "react";
import type { AdvancedColorPattern } from "@/lib/advancedPattern";
import { AdvancedPatternSVG } from "./AdvancedPatternSVG";
import { compressImage } from "@/lib/imageUtils";

const PRESET_COLORS = [
  "#ffffff", "#000000", "#e74c3c", "#2F5496", "#27ae60", "#b8860b",
  "#8e44ad", "#e67e22", "#8B4513", "#ff69b4", "#f1c40f", "#1abc9c",
  "#006400", "#333333", "#c0c0c0", "#800000",
];

interface Props {
  pattern: AdvancedColorPattern;
  onChange: (p: AdvancedColorPattern) => void;
  itemType: string;
  itemLength: number;
  itemWidth: number;
}

export function AdvancedPatternEditorPanel({
  pattern,
  onChange,
  itemType,
  itemLength,
  itemWidth,
}: Props) {
  const [expandedSection, setExpandedSection] = useState<string | null>("background");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function toggle(section: string) {
    setExpandedSection((prev) => (prev === section ? null : section));
  }

  function update(partial: Partial<AdvancedColorPattern>) {
    onChange({ ...pattern, ...partial });
  }

  return (
    <div>
      {/* Live preview */}
      <div className="mb-3 flex items-center justify-center rounded-lg bg-gray-50 p-4">
        <AdvancedPatternSVG
          pattern={pattern}
          type={itemType}
          length={itemLength}
          width={itemWidth}
          maxWidth={260}
        />
      </div>

      <div className="max-h-[300px] space-y-1.5 overflow-y-auto">
        {/* ── Height ── */}
        <Section title="Hojd" id="height" expanded={expandedSection} onToggle={toggle}>
          <div className="flex gap-2">
            {([1, 2, 3] as const).map((h) => (
              <button
                key={h}
                onClick={() => update({ height: h })}
                className={`flex-1 rounded-lg border py-2 text-xs font-bold transition-colors ${
                  pattern.height === h
                    ? "border-[#b8860b] bg-amber-50 text-[#b8860b]"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                <div
                  className="mx-auto mb-1 rounded-sm bg-current"
                  style={{ width: 40, height: h === 1 ? 4 : h === 2 ? 8 : 16 }}
                />
                {h === 1 ? "Smal" : h === 2 ? "Normal" : "Bred"}
              </button>
            ))}
          </div>
        </Section>

        {/* ── Background & Ends ── */}
        <Section title="Bakgrund & Andar" id="background" expanded={expandedSection} onToggle={toggle}>
          <label className="mb-1 block text-[10px] font-semibold text-gray-500">Bakgrundsfarg</label>
          <div className="mb-2 flex items-center gap-2">
            <input
              type="color"
              value={pattern.background}
              onChange={(e) => update({ background: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border border-gray-200"
            />
            <div className="flex flex-wrap gap-1">
              {PRESET_COLORS.slice(0, 8).map((c) => (
                <button
                  key={c}
                  onClick={() => update({ background: c })}
                  className="h-6 w-6 rounded-full border-2 hover:scale-110"
                  style={{ backgroundColor: c, borderColor: c === "#ffffff" ? "#d1d5db" : "transparent" }}
                />
              ))}
            </div>
          </div>

          <div className="mb-1 flex items-center gap-2">
            <label className="text-[10px] font-semibold text-gray-500">Andpartier</label>
            <ToggleSwitch
              on={!!pattern.ends}
              onToggle={(on) => update({ ends: on ? { color: "#b8860b", percent: 10, endStyle: "rect" } : null })}
            />
          </div>
          {pattern.ends && (
            <>
              <div className="mb-2 flex items-center gap-2">
                <input
                  type="color"
                  value={pattern.ends.color}
                  onChange={(e) => update({ ends: { ...pattern.ends!, color: e.target.value } })}
                  className="h-7 w-9 cursor-pointer rounded border border-gray-200"
                />
                <input
                  type="range"
                  min={5}
                  max={25}
                  value={pattern.ends.percent}
                  onChange={(e) => update({ ends: { ...pattern.ends!, percent: Number(e.target.value) } })}
                  className="flex-1 accent-[#b8860b]"
                />
                <span className="w-8 text-right text-[10px] font-medium text-gray-400">
                  {pattern.ends.percent}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-semibold text-gray-500">Form</label>
                <div className="flex gap-1">
                  {(["rect", "diagonal"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => update({ ends: { ...pattern.ends!, endStyle: s } })}
                      className={`rounded-md border px-2.5 py-1 text-xs font-bold ${
                        (pattern.ends!.endStyle ?? "rect") === s
                          ? "border-[#b8860b] bg-amber-50 text-[#b8860b]"
                          : "border-gray-200 text-gray-500"
                      }`}
                    >
                      {s === "rect" ? "▬ Rakt" : "◣ Diagonalt"}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </Section>

        {/* ── Diagonal stripes ── */}
        <Section title="Diagonala rander" id="diagonals" expanded={expandedSection} onToggle={toggle}>
          <div className="mb-1 flex items-center gap-2">
            <label className="text-[10px] font-semibold text-gray-500">Aktivera</label>
            <ToggleSwitch
              on={!!pattern.diagonals}
              onToggle={(on) =>
                update({
                  diagonals: on
                    ? { colors: ["#000000", "#ffffff"], angle: 45, stripeWidth: 6 }
                    : null,
                })
              }
            />
          </div>
          {pattern.diagonals && (
            <>
              <label className="mb-1 block text-[10px] font-semibold text-gray-500">Farger</label>
              <div className="mb-2 flex gap-1.5">
                {pattern.diagonals.colors.map((c, i) => (
                  <input
                    key={i}
                    type="color"
                    value={c}
                    onChange={(e) => {
                      const newColors = [...pattern.diagonals!.colors];
                      newColors[i] = e.target.value;
                      update({ diagonals: { ...pattern.diagonals!, colors: newColors } });
                    }}
                    className="h-7 w-9 cursor-pointer rounded border border-gray-200"
                  />
                ))}
                {pattern.diagonals.colors.length < 4 && (
                  <button
                    onClick={() =>
                      update({
                        diagonals: {
                          ...pattern.diagonals!,
                          colors: [...pattern.diagonals!.colors, "#e5e7eb"],
                        },
                      })
                    }
                    className="flex h-7 w-7 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400 hover:border-[#b8860b]"
                  >
                    +
                  </button>
                )}
                {pattern.diagonals.colors.length > 2 && (
                  <button
                    onClick={() =>
                      update({
                        diagonals: {
                          ...pattern.diagonals!,
                          colors: pattern.diagonals!.colors.slice(0, -1),
                        },
                      })
                    }
                    className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-xs text-gray-400 hover:border-red-400"
                  >
                    −
                  </button>
                )}
              </div>
              <div className="mb-2 flex items-center gap-3">
                <label className="text-[10px] font-semibold text-gray-500">Vinkel</label>
                <div className="flex gap-1">
                  {[45, -45].map((a) => (
                    <button
                      key={a}
                      onClick={() => update({ diagonals: { ...pattern.diagonals!, angle: a } })}
                      className={`rounded-md border px-3 py-1 text-xs font-bold ${
                        pattern.diagonals!.angle === a
                          ? "border-[#b8860b] bg-amber-50 text-[#b8860b]"
                          : "border-gray-200 text-gray-500"
                      }`}
                    >
                      {a > 0 ? "╱" : "╲"} {Math.abs(a)}°
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-semibold text-gray-500">Randbredd</label>
                <input
                  type="range"
                  min={3}
                  max={15}
                  value={pattern.diagonals.stripeWidth}
                  onChange={(e) =>
                    update({ diagonals: { ...pattern.diagonals!, stripeWidth: Number(e.target.value) } })
                  }
                  className="flex-1 accent-[#b8860b]"
                />
                <span className="w-5 text-right text-[10px] font-medium text-gray-400">
                  {pattern.diagonals.stripeWidth}
                </span>
              </div>
            </>
          )}
        </Section>

        {/* ── Text ── */}
        <Section title="Text" id="text" expanded={expandedSection} onToggle={toggle}>
          <div className="mb-1 flex items-center gap-2">
            <label className="text-[10px] font-semibold text-gray-500">Aktivera</label>
            <ToggleSwitch
              on={!!pattern.text}
              onToggle={(on) =>
                update({
                  text: on
                    ? { content: "", fontSize: 14, fontWeight: "bold", color: "#ffffff", align: "center" }
                    : null,
                })
              }
            />
          </div>
          {pattern.text && (
            <>
              <input
                type="text"
                placeholder="Sponsornamn..."
                value={pattern.text.content}
                onChange={(e) => update({ text: { ...pattern.text!, content: e.target.value } })}
                className="mb-2 w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm font-bold focus:border-[#b8860b] focus:outline-none"
              />
              <div className="mb-2 flex items-center gap-2">
                <input
                  type="color"
                  value={pattern.text.color}
                  onChange={(e) => update({ text: { ...pattern.text!, color: e.target.value } })}
                  className="h-7 w-9 cursor-pointer rounded border border-gray-200"
                />
                <select
                  value={pattern.text.fontSize}
                  onChange={(e) => update({ text: { ...pattern.text!, fontSize: Number(e.target.value) } })}
                  className="rounded-md border border-gray-200 px-2 py-1 text-xs"
                >
                  {[8, 10, 12, 14, 16].map((s) => (
                    <option key={s} value={s}>
                      {s}px
                    </option>
                  ))}
                </select>
                <button
                  onClick={() =>
                    update({
                      text: {
                        ...pattern.text!,
                        fontWeight: pattern.text!.fontWeight === "bold" ? "normal" : "bold",
                      },
                    })
                  }
                  className={`rounded-md border px-2.5 py-1 text-xs font-bold ${
                    pattern.text.fontWeight === "bold"
                      ? "border-[#b8860b] bg-amber-50 text-[#b8860b]"
                      : "border-gray-200 text-gray-400"
                  }`}
                >
                  B
                </button>
                <div className="flex gap-0.5">
                  {(["left", "center", "right"] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => update({ text: { ...pattern.text!, align: a } })}
                      className={`rounded-md border px-1.5 py-1 text-xs ${
                        pattern.text!.align === a
                          ? "border-[#b8860b] bg-amber-50 text-[#b8860b]"
                          : "border-gray-200 text-gray-400"
                      }`}
                    >
                      {a === "left" ? "←" : a === "center" ? "↔" : "→"}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </Section>

        {/* ── Logo ── */}
        <Section title="Logotyp" id="logo" expanded={expandedSection} onToggle={toggle}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              try {
                const compressed = await compressImage(file, 200, 0.7);
                update({
                  logo: {
                    dataUrl: compressed,
                    position: pattern.logo?.position || "center",
                    scale: pattern.logo?.scale || 0.8,
                    overflow: pattern.logo?.overflow ?? false,
                  },
                });
              } finally {
                setUploading(false);
              }
            }}
            className="hidden"
          />
          {pattern.logo ? (
            <div>
              <div className="mb-2 flex items-center justify-center rounded-lg bg-gray-50 p-2">
                <img
                  src={pattern.logo.dataUrl}
                  alt="Logo"
                  className="max-h-[40px] max-w-[80px] object-contain"
                />
              </div>
              <div className="mb-2 flex items-center gap-2">
                <label className="text-[10px] font-semibold text-gray-500">Position</label>
                <div className="flex gap-0.5">
                  {(["left", "center", "right"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => update({ logo: { ...pattern.logo!, position: p } })}
                      className={`rounded-md border px-2 py-1 text-xs ${
                        pattern.logo!.position === p
                          ? "border-[#b8860b] bg-amber-50 text-[#b8860b]"
                          : "border-gray-200 text-gray-400"
                      }`}
                    >
                      {p === "left" ? "Vanster" : p === "center" ? "Mitten" : "Hoger"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <label className="text-[10px] font-semibold text-gray-500">Storlek</label>
                <input
                  type="range"
                  min={50}
                  max={100}
                  value={Math.round(pattern.logo.scale * 100)}
                  onChange={(e) =>
                    update({ logo: { ...pattern.logo!, scale: Number(e.target.value) / 100 } })
                  }
                  className="flex-1 accent-[#b8860b]"
                />
              </div>
              <div className="mb-2 flex items-center gap-2">
                <label className="text-[10px] font-semibold text-gray-500">Sticker ut</label>
                <ToggleSwitch
                  on={!!pattern.logo.overflow}
                  onToggle={(on) => update({ logo: { ...pattern.logo!, overflow: on } })}
                />
                <span className="text-[9px] text-gray-400">Logga utanfor planka</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Byt bild
                </button>
                <button
                  onClick={() => update({ logo: null })}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50"
                >
                  Ta bort
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-4 text-xs text-gray-400 hover:border-[#b8860b] hover:text-[#b8860b]"
            >
              {uploading ? "Laddar..." : "Ladda upp logotyp"}
            </button>
          )}
        </Section>
      </div>
    </div>
  );
}

// ── Collapsible Section ──
function Section({
  title,
  id,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  id: string;
  expanded: string | null;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  const isOpen = expanded === id;
  return (
    <div className="rounded-lg border border-gray-100">
      <button
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-bold text-gray-600 hover:bg-gray-50"
      >
        {title}
        <span className="text-gray-400">{isOpen ? "▾" : "▸"}</span>
      </button>
      {isOpen && <div className="border-t border-gray-100 px-3 py-2.5">{children}</div>}
    </div>
  );
}

// ── Toggle Switch ──
function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: (on: boolean) => void }) {
  return (
    <button
      onClick={() => onToggle(!on)}
      className={`relative h-5 w-9 rounded-full transition-colors ${
        on ? "bg-[#b8860b]" : "bg-gray-300"
      }`}
    >
      <div
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
