"use client";

import { useId } from "react";

export interface ColorSegment {
  color: string;
  percent: number;
}

interface ColorPatternSVGProps {
  colorPattern: ColorSegment[];
  type: string; // "pole" | "plank" | "gate"
  length: number; // 2.5, 3.0, 3.2
  width: number; // 0.1, 0.2
  maxWidth?: number;
  onClick?: () => void;
  className?: string;
}

export function ColorPatternSVG({
  colorPattern,
  type,
  length,
  width,
  maxWidth = 160,
  onClick,
  className = "",
}: ColorPatternSVGProps) {
  const clipId = useId();

  // Calculate proportional dimensions
  const lengthScale = length / 3.2; // normalize to max length
  const svgWidth = Math.round(maxWidth * lengthScale);

  let svgHeight: number;
  if (type === "gate") {
    svgHeight = 48;
  } else if (width >= 0.2) {
    // plank
    svgHeight = 28;
  } else {
    // pole
    svgHeight = 14;
  }

  const rx = type === "pole" ? svgHeight / 2 : 3;

  // Build segments using cumulative percentage rounding
  // This ensures no gaps and exact total width regardless of segment sizes
  let segments: { x: number; w: number; color: string }[] = [];
  if (colorPattern.length > 0) {
    let cumPercent = 0;
    segments = colorPattern.map((seg) => {
      const x = Math.round((cumPercent / 100) * svgWidth);
      cumPercent += seg.percent;
      const xEnd = Math.round((cumPercent / 100) * svgWidth);
      return { x, w: xEnd - x, color: seg.color };
    });
  }

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      onClick={onClick}
      className={`${onClick ? "cursor-pointer" : ""} ${className}`}
      role={onClick ? "button" : undefined}
    >
      {/* Clip path for rounded shape */}
      <defs>
        <clipPath id={clipId}>
          <rect
            x={0}
            y={0}
            width={svgWidth}
            height={svgHeight}
            rx={rx}
            ry={rx}
          />
        </clipPath>
      </defs>

      {/* Color segments */}
      <g clipPath={`url(#${clipId})`}>
        {segments.length > 0 ? (
          segments.map((seg, i) => (
            <rect
              key={i}
              x={seg.x}
              y={0}
              width={seg.w}
              height={svgHeight}
              fill={seg.color}
            />
          ))
        ) : (
          <rect
            x={0}
            y={0}
            width={svgWidth}
            height={svgHeight}
            fill="#e5e7eb"
          />
        )}
      </g>

      {/* Border */}
      <rect
        x={0.5}
        y={0.5}
        width={svgWidth - 1}
        height={svgHeight - 1}
        fill="none"
        stroke="#94a3b8"
        strokeWidth={0.5}
        rx={rx}
        ry={rx}
      />
    </svg>
  );
}
