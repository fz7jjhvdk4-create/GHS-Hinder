// ─── Shared geometry computation for Advanced Plank SVG ────
// Used by: client component, server component (/view), and HTML export

import type { AdvancedColorPattern } from "./advancedPattern";
import { resolveHeight } from "./advancedPattern";

export interface SvgGeometry {
  svgWidth: number;
  svgHeight: number;
  background: string;
  endRects: {
    leftX: number;
    rightX: number;
    width: number;
    fill: string;
  } | null;
  diagonalPattern: {
    patternWidth: number;
    colors: string[];
    angle: number;
  } | null;
  textElement: {
    x: number;
    y: number;
    content: string;
    fontSize: number;
    fontWeight: string;
    fill: string;
    anchor: string;
  } | null;
  logoElement: {
    x: number;
    y: number;
    width: number;
    height: number;
    href: string;
  } | null;
}

export function computeAdvancedSvgGeometry(
  pattern: AdvancedColorPattern,
  type: string,
  length: number,
  width: number,
  maxWidth: number
): SvgGeometry {
  const lengthScale = length / 3.2;
  const svgWidth = Math.round(maxWidth * lengthScale);
  const svgHeight = resolveHeight(type, width, pattern.height);

  // End rects
  let endRects: SvgGeometry["endRects"] = null;
  if (pattern.ends) {
    const endW = Math.round((pattern.ends.percent / 100) * svgWidth);
    endRects = {
      leftX: 0,
      rightX: svgWidth - endW,
      width: endW,
      fill: pattern.ends.color,
    };
  }

  // Diagonal pattern
  let diagonalPattern: SvgGeometry["diagonalPattern"] = null;
  if (pattern.diagonals && pattern.diagonals.colors.length >= 2) {
    diagonalPattern = {
      patternWidth: pattern.diagonals.stripeWidth,
      colors: pattern.diagonals.colors,
      angle: pattern.diagonals.angle,
    };
  }

  // Text
  let textElement: SvgGeometry["textElement"] = null;
  if (pattern.text && pattern.text.content.trim()) {
    const align = pattern.text.align;
    let x: number;
    let anchor: string;
    if (align === "left") {
      x = endRects ? endRects.width + 4 : 4;
      anchor = "start";
    } else if (align === "right") {
      x = endRects ? svgWidth - endRects.width - 4 : svgWidth - 4;
      anchor = "end";
    } else {
      x = svgWidth / 2;
      anchor = "middle";
    }

    // Scale font size proportionally to height
    const scaleFactor = svgHeight / 24; // normalize to tallest
    const fontSize = Math.max(4, Math.round(pattern.text.fontSize * scaleFactor));

    textElement = {
      x,
      y: svgHeight / 2,
      content: pattern.text.content,
      fontSize,
      fontWeight: pattern.text.fontWeight,
      fill: pattern.text.color,
      anchor,
    };
  }

  // Logo
  let logoElement: SvgGeometry["logoElement"] = null;
  if (pattern.logo && pattern.logo.dataUrl) {
    const scale = pattern.logo.scale;
    const logoH = Math.round(svgHeight * scale * 0.8);
    const logoW = logoH; // square aspect for simplicity
    const y = Math.round((svgHeight - logoH) / 2);

    let x: number;
    if (pattern.logo.position === "left") {
      x = endRects ? endRects.width + 2 : 2;
    } else if (pattern.logo.position === "right") {
      x = (endRects ? svgWidth - endRects.width : svgWidth) - logoW - 2;
    } else {
      x = Math.round((svgWidth - logoW) / 2);
    }

    logoElement = {
      x,
      y,
      width: logoW,
      height: logoH,
      href: pattern.logo.dataUrl,
    };
  }

  return {
    svgWidth,
    svgHeight,
    background: pattern.background,
    endRects,
    diagonalPattern,
    textElement,
    logoElement,
  };
}
