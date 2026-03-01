// ─── Shared geometry computation for Advanced Plank SVG ────
// Used by: client component, server component (/view), and HTML export

import type { AdvancedColorPattern } from "./advancedPattern";
import { resolveHeight } from "./advancedPattern";

export interface SvgGeometry {
  svgWidth: number;
  svgHeight: number; // total SVG height (expanded when logo overflows)
  plankY: number; // y-offset of plank within SVG (>0 when logo overflows)
  plankHeight: number; // the actual plank height
  background: string;
  endRects: {
    leftX: number;
    rightX: number;
    width: number;
    fill: string;
  } | null;
  endPolygons: {
    leftPoints: string; // SVG polygon points
    rightPoints: string;
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
    overflow: boolean;
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
  const plankHeight = resolveHeight(type, width, pattern.height);

  // End rects / polygons
  let endRects: SvgGeometry["endRects"] = null;
  let endPolygons: SvgGeometry["endPolygons"] = null;
  let endW = 0;

  if (pattern.ends) {
    endW = Math.round((pattern.ends.percent / 100) * svgWidth);
    const endStyle = pattern.ends.endStyle ?? "rect";

    if (endStyle !== "diagonal") {
      endRects = {
        leftX: 0,
        rightX: svgWidth - endW,
        width: endW,
        fill: pattern.ends.color,
      };
    }
    // diagonal polygons set below after plankY is computed
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

  // Text (Y adjusted for plankY below)
  let textElement: SvgGeometry["textElement"] = null;
  if (pattern.text && pattern.text.content.trim()) {
    const align = pattern.text.align;
    let x: number;
    let anchor: string;
    if (align === "left") {
      x = endW > 0 ? endW + 4 : 4;
      anchor = "start";
    } else if (align === "right") {
      x = endW > 0 ? svgWidth - endW - 4 : svgWidth - 4;
      anchor = "end";
    } else {
      x = svgWidth / 2;
      anchor = "middle";
    }

    const scaleFactor = plankHeight / 24;
    const fontSize = Math.max(4, Math.round(pattern.text.fontSize * scaleFactor));

    textElement = {
      x,
      y: plankHeight / 2, // relative to plank top
      content: pattern.text.content,
      fontSize,
      fontWeight: pattern.text.fontWeight,
      fill: pattern.text.color,
      anchor,
    };
  }

  // Logo
  let logoElement: SvgGeometry["logoElement"] = null;
  const isLogoOverflow = !!(pattern.logo && pattern.logo.overflow);

  if (pattern.logo && pattern.logo.dataUrl) {
    const scale = pattern.logo.scale;
    let logoH: number;
    let logoW: number;
    let y: number;

    if (isLogoOverflow) {
      // Overflowing: logo is 2.5× plank height, centered on plank
      logoH = Math.round(plankHeight * 2.5);
      logoW = logoH;
      y = Math.round(plankHeight / 2 - logoH / 2);
    } else {
      logoH = Math.round(plankHeight * scale * 0.8);
      logoW = logoH;
      y = Math.round((plankHeight - logoH) / 2);
    }

    let x: number;
    if (pattern.logo.position === "left") {
      x = endW > 0 ? endW + 2 : 2;
    } else if (pattern.logo.position === "right") {
      x = (endW > 0 ? svgWidth - endW : svgWidth) - logoW - 2;
    } else {
      x = Math.round((svgWidth - logoW) / 2);
    }

    logoElement = {
      x,
      y,
      width: logoW,
      height: logoH,
      href: pattern.logo.dataUrl,
      overflow: isLogoOverflow,
    };
  }

  // Calculate plankY and total SVG height
  let plankY = 0;
  let totalSvgHeight = plankHeight;

  if (logoElement && logoElement.overflow) {
    const overflowTop = Math.max(0, -logoElement.y);
    const overflowBottom = Math.max(0, logoElement.y + logoElement.height - plankHeight);
    plankY = overflowTop;
    totalSvgHeight = overflowTop + plankHeight + overflowBottom;
    // Adjust logo Y for plankY offset
    logoElement.y = logoElement.y + plankY;
  }

  // Adjust text Y for plankY offset
  if (textElement) {
    textElement.y = textElement.y + plankY;
  }

  // Set diagonal end polygons with correct plankY
  if (pattern.ends && (pattern.ends.endStyle ?? "rect") === "diagonal" && endW > 0) {
    endPolygons = {
      leftPoints: `0,${plankY} ${endW},${plankY} 0,${plankY + plankHeight}`,
      rightPoints: `${svgWidth},${plankY} ${svgWidth - endW},${plankY} ${svgWidth},${plankY + plankHeight}`,
      fill: pattern.ends.color,
    };
  }

  return {
    svgWidth,
    svgHeight: totalSvgHeight,
    plankY,
    plankHeight,
    background: pattern.background,
    endRects,
    endPolygons,
    diagonalPattern,
    textElement,
    logoElement,
  };
}
