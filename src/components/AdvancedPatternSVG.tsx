"use client";

import { useId } from "react";
import type { AdvancedColorPattern } from "@/lib/advancedPattern";
import { computeAdvancedSvgGeometry } from "@/lib/advancedPatternSvg";

interface AdvancedPatternSVGProps {
  pattern: AdvancedColorPattern;
  type: string;
  length: number;
  width: number;
  maxWidth?: number;
  onClick?: () => void;
  className?: string;
}

export function AdvancedPatternSVG({
  pattern,
  type,
  length,
  width,
  maxWidth = 160,
  onClick,
  className = "",
}: AdvancedPatternSVGProps) {
  const uid = useId();
  const clipId = `adv-clip-${uid}`;
  const diagId = `adv-diag-${uid}`;

  const geo = computeAdvancedSvgGeometry(pattern, type, length, width, maxWidth);

  return (
    <svg
      width={geo.svgWidth}
      height={geo.svgHeight}
      viewBox={`0 0 ${geo.svgWidth} ${geo.svgHeight}`}
      onClick={onClick}
      className={`${onClick ? "cursor-pointer" : ""} ${className}`}
      role={onClick ? "button" : undefined}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={geo.svgWidth} height={geo.svgHeight} rx={1} ry={1} />
        </clipPath>
        {geo.diagonalPattern && (
          <pattern
            id={diagId}
            width={geo.diagonalPattern.patternWidth * geo.diagonalPattern.colors.length}
            height={geo.diagonalPattern.patternWidth * geo.diagonalPattern.colors.length}
            patternUnits="userSpaceOnUse"
            patternTransform={`rotate(${geo.diagonalPattern.angle})`}
          >
            {geo.diagonalPattern.colors.map((color, i) => (
              <rect
                key={i}
                x={i * geo.diagonalPattern!.patternWidth}
                y={0}
                width={geo.diagonalPattern!.patternWidth}
                height={geo.diagonalPattern!.patternWidth * geo.diagonalPattern!.colors.length}
                fill={color}
              />
            ))}
          </pattern>
        )}
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {/* 1. Background */}
        <rect x={0} y={0} width={geo.svgWidth} height={geo.svgHeight} fill={geo.background} />

        {/* 2. Diagonal pattern overlay */}
        {geo.diagonalPattern && (
          <rect x={0} y={0} width={geo.svgWidth} height={geo.svgHeight} fill={`url(#${diagId})`} />
        )}

        {/* 3. End colors */}
        {geo.endRects && (
          <>
            <rect x={geo.endRects.leftX} y={0} width={geo.endRects.width} height={geo.svgHeight} fill={geo.endRects.fill} />
            <rect x={geo.endRects.rightX} y={0} width={geo.endRects.width} height={geo.svgHeight} fill={geo.endRects.fill} />
          </>
        )}

        {/* 4. Logo */}
        {geo.logoElement && (
          <image
            href={geo.logoElement.href}
            x={geo.logoElement.x}
            y={geo.logoElement.y}
            width={geo.logoElement.width}
            height={geo.logoElement.height}
            preserveAspectRatio="xMidYMid meet"
          />
        )}

        {/* 5. Text */}
        {geo.textElement && (
          <text
            x={geo.textElement.x}
            y={geo.textElement.y}
            fontSize={geo.textElement.fontSize}
            fontWeight={geo.textElement.fontWeight}
            fill={geo.textElement.fill}
            textAnchor={geo.textElement.anchor as "start" | "middle" | "end"}
            dominantBaseline="central"
            fontFamily="sans-serif"
          >
            {geo.textElement.content}
          </text>
        )}
      </g>

      {/* Border */}
      <rect
        x={0.5}
        y={0.5}
        width={geo.svgWidth - 1}
        height={geo.svgHeight - 1}
        fill="none"
        stroke="#94a3b8"
        strokeWidth={0.5}
        rx={1}
        ry={1}
      />
    </svg>
  );
}
