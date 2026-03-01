// ─── Advanced Plank Pattern Types ──────────────────────────

export interface AdvancedColorPattern {
  mode: "advanced";
  height: 1 | 2 | 3; // 1=smal(8px), 2=normal(12px), 3=bred(24px)
  background: string; // hex color
  ends: {
    color: string;
    percent: number; // 5-25% each end
    endStyle?: "rect" | "diagonal"; // default "rect"
  } | null;
  diagonals: {
    colors: string[]; // 2+ colors
    angle: number; // degrees (45 or -45)
    stripeWidth: number; // 3-15
  } | null;
  text: {
    content: string;
    fontSize: number; // 8-16
    fontWeight: "normal" | "bold";
    color: string;
    align: "center" | "left" | "right";
  } | null;
  logo: {
    dataUrl: string; // base64 compressed
    position: "center" | "left" | "right";
    scale: number; // 0.5-1.0
    overflow?: boolean; // logo extends above/below plank
  } | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isAdvancedPattern(cp: any): cp is AdvancedColorPattern {
  return (
    cp !== null &&
    typeof cp === "object" &&
    !Array.isArray(cp) &&
    cp.mode === "advanced"
  );
}

/** Map height enum to rendered pixel height */
const HEIGHT_MAP: Record<number, number> = { 1: 8, 2: 12, 3: 24 };

export function resolveHeight(
  type: string,
  width: number,
  height: number
): number {
  if (height > 0 && HEIGHT_MAP[height]) return HEIGHT_MAP[height];
  // Auto: same as current logic
  if (type === "gate") return 24;
  if (width >= 0.2) return 12;
  return 8;
}

/** Map DB height int (0-3) to AdvancedColorPattern height (1-3) */
export function dbHeightToEnum(dbHeight: number): 1 | 2 | 3 {
  if (dbHeight === 1) return 1;
  if (dbHeight === 3) return 3;
  return 2; // default normal
}

/** Map AdvancedColorPattern height (1-3) to DB int */
export function enumToDbHeight(enumHeight: 1 | 2 | 3): number {
  return enumHeight;
}

export const DEFAULT_ADVANCED_PATTERN: AdvancedColorPattern = {
  mode: "advanced",
  height: 2,
  background: "#006400",
  ends: null,
  diagonals: null,
  text: null,
  logo: null,
};
