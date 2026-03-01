import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { isAdvancedPattern } from "@/lib/advancedPattern";
import { computeAdvancedSvgGeometry } from "@/lib/advancedPatternSvg";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const fences = await prisma.fence.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        section: true,
        images: { orderBy: { sortOrder: "asc" } },
        components: true,
      },
    });

    const fenceSections = await prisma.section.findMany({
      where: { type: "fence" },
      orderBy: { sortOrder: "asc" },
    });

    const ppItems = await prisma.poleOrPlank.findMany({
      orderBy: { sortOrder: "asc" },
      include: { section: true },
    });

    const ppSections = await prisma.section.findMany({
      where: { type: "pp" },
      orderBy: { sortOrder: "asc" },
    });

    // Stats
    const fenceTotal = fences.length;
    const fenceChecked = fences.filter((f) => f.checked).length;
    const totalWings = fences.reduce((sum, f) => {
      const w = f.components.find((c) => c.type.toLowerCase() === "wings");
      return sum + (w?.count ?? 0);
    }, 0);
    const ppTotal = ppItems.length;
    const ppChecked = ppItems.filter((p) => p.checked).length;

    const now = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" });

    const html = buildHTML({
      fences,
      fenceSections,
      ppItems,
      ppSections,
      stats: { fenceTotal, fenceChecked, totalWings, ppTotal, ppChecked },
      exportDate: now,
    });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="GHS_Hinderinventering_${new Date().toISOString().slice(0, 10)}.html"`,
      },
    });
  } catch (error) {
    console.error("Error generating export:", error);
    return NextResponse.json({ error: "Failed to generate export" }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildHTML(data: any): string {
  const { fences, fenceSections, ppItems, ppSections, stats, exportDate } = data;

  // Group fences by section
  const fencesBySection = new Map<string, typeof fences>();
  for (const f of fences) {
    const key = f.sectionId;
    if (!fencesBySection.has(key)) fencesBySection.set(key, []);
    fencesBySection.get(key)!.push(f);
  }

  // Group PP by section
  const ppBySection = new Map<string, typeof ppItems>();
  for (const p of ppItems) {
    const key = p.sectionId;
    if (!ppBySection.has(key)) ppBySection.set(key, []);
    ppBySection.get(key)!.push(p);
  }

  function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getPrimaryImageUrl(images: any[]): string | null {
    if (!images || images.length === 0) return null;
    const primary = images.find((img: { isPrimary?: boolean }) => img.isPrimary);
    return primary ? primary.imageUrl : images[0].imageUrl;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getOtherImages(images: any[]): any[] {
    if (!images || images.length <= 1) return [];
    const primaryId = (images.find((img: { isPrimary?: boolean }) => img.isPrimary) || images[0]).id;
    return images.filter((img: { id: string }) => img.id !== primaryId);
  }

  let svgCounter = 0;
  function buildColorPatternSVG(colorPattern: { color: string; percent: number }[], type: string, length: number, width: number): string {
    if (!Array.isArray(colorPattern) || colorPattern.length === 0) return "";
    const clipId = `cp-${++svgCounter}`;
    const maxWidth = 80;
    const lengthScale = length / 3.2;
    const svgWidth = Math.round(maxWidth * lengthScale);
    let svgHeight: number;
    if (type === "gate") svgHeight = 24;
    else if (width >= 0.2) svgHeight = 12;
    else svgHeight = 8;

    let cumPercent = 0;
    const rects = colorPattern.map((seg) => {
      const x = Math.round((cumPercent / 100) * svgWidth);
      cumPercent += seg.percent;
      const xEnd = Math.round((cumPercent / 100) * svgWidth);
      return `<rect x="${x}" y="0" width="${xEnd - x}" height="${svgHeight}" fill="${esc(seg.color)}"/>`;
    }).join("");

    return `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" style="vertical-align:middle;margin-right:6px;border-radius:2px"><clipPath id="${clipId}"><rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" rx="1" ry="1"/></clipPath><g clip-path="url(#${clipId})">${rects}</g><rect x="0.5" y="0.5" width="${svgWidth - 1}" height="${svgHeight - 1}" fill="none" stroke="#94a3b8" stroke-width="0.5" rx="1" ry="1"/></svg>`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function buildAdvancedPatternSVG(colorPattern: any, type: string, length: number, width: number): string {
    if (!isAdvancedPattern(colorPattern)) return "";
    const geo = computeAdvancedSvgGeometry(colorPattern, type, length, width, 80);
    const clipId = `acp-${++svgCounter}`;
    const diagId = `adp-${svgCounter}`;

    let defs = `<clipPath id="${clipId}"><rect x="0" y="${geo.plankY}" width="${geo.svgWidth}" height="${geo.plankHeight}" rx="1" ry="1"/></clipPath>`;
    if (geo.diagonalPattern) {
      const totalW = geo.diagonalPattern.patternWidth * geo.diagonalPattern.colors.length;
      const rects = geo.diagonalPattern.colors.map((color, i) =>
        `<rect x="${i * geo.diagonalPattern!.patternWidth}" y="0" width="${geo.diagonalPattern!.patternWidth}" height="${totalW}" fill="${esc(color)}"/>`
      ).join("");
      defs += `<pattern id="${diagId}" width="${totalW}" height="${totalW}" patternUnits="userSpaceOnUse" patternTransform="rotate(${geo.diagonalPattern.angle})">${rects}</pattern>`;
    }

    let content = `<rect x="0" y="${geo.plankY}" width="${geo.svgWidth}" height="${geo.plankHeight}" fill="${esc(geo.background)}"/>`;
    if (geo.diagonalPattern) {
      content += `<rect x="0" y="${geo.plankY}" width="${geo.svgWidth}" height="${geo.plankHeight}" fill="url(#${diagId})"/>`;
    }
    if (geo.endRects) {
      content += `<rect x="${geo.endRects.leftX}" y="${geo.plankY}" width="${geo.endRects.width}" height="${geo.plankHeight}" fill="${esc(geo.endRects.fill)}"/>`;
      content += `<rect x="${geo.endRects.rightX}" y="${geo.plankY}" width="${geo.endRects.width}" height="${geo.plankHeight}" fill="${esc(geo.endRects.fill)}"/>`;
    }
    if (geo.endPolygons) {
      content += `<polygon points="${geo.endPolygons.leftPoints}" fill="${esc(geo.endPolygons.fill)}"/>`;
      content += `<polygon points="${geo.endPolygons.rightPoints}" fill="${esc(geo.endPolygons.fill)}"/>`;
    }
    if (geo.logoElement && !geo.logoElement.overflow) {
      content += `<image href="${geo.logoElement.href}" x="${geo.logoElement.x}" y="${geo.logoElement.y}" width="${geo.logoElement.width}" height="${geo.logoElement.height}" preserveAspectRatio="xMidYMid meet"/>`;
    }
    if (geo.textElement) {
      content += `<text x="${geo.textElement.x}" y="${geo.textElement.y}" font-size="${geo.textElement.fontSize}" font-weight="${geo.textElement.fontWeight}" fill="${esc(geo.textElement.fill)}" text-anchor="${geo.textElement.anchor}" dominant-baseline="central" font-family="sans-serif">${esc(geo.textElement.content)}</text>`;
    }

    let afterClip = "";
    if (geo.logoElement && geo.logoElement.overflow) {
      afterClip += `<image href="${geo.logoElement.href}" x="${geo.logoElement.x}" y="${geo.logoElement.y}" width="${geo.logoElement.width}" height="${geo.logoElement.height}" preserveAspectRatio="xMidYMid meet"/>`;
    }

    return `<svg width="${geo.svgWidth}" height="${geo.svgHeight}" viewBox="0 0 ${geo.svgWidth} ${geo.svgHeight}" style="vertical-align:middle;margin-right:6px;border-radius:2px"><defs>${defs}</defs><g clip-path="url(#${clipId})">${content}</g>${afterClip}<rect x="0.5" y="${geo.plankY + 0.5}" width="${geo.svgWidth - 1}" height="${geo.plankHeight - 1}" fill="none" stroke="#94a3b8" stroke-width="0.5" rx="1" ry="1"/></svg>`;
  }

  // Build fence sections HTML
  let fenceSectionsHTML = "";
  for (const section of fenceSections) {
    const sectionFences = fencesBySection.get(section.id) || [];
    if (sectionFences.length === 0) continue;

    fenceSectionsHTML += `
    <div class="section">
      <div class="section-header" style="background:${esc(section.color)}">
        ${esc(section.name)} <span class="count">(${sectionFences.length})</span>
      </div>
      ${sectionFences
        .map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (f: any) => {
            const primaryUrl = getPrimaryImageUrl(f.images);
            const otherImages = getOtherImages(f.images);
            return `
        <div class="card ${f.checked ? "checked" : ""}">
          <div class="card-top">
            ${
              primaryUrl
                ? `<img class="card-img" src="${primaryUrl}" alt="${esc(f.name)}" />`
                : '<div class="card-img placeholder">Ingen bild</div>'
            }
            <div class="card-info">
              <div class="card-title">
                <span class="check">${f.checked ? "✅" : "⬜"}</span>
                ${esc(f.name)}
              </div>
              ${
                f.components.length > 0
                  ? `<table class="comp-table">
                  ${f.components
                    .map(
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (c: any) =>
                        `<tr><td class="comp-type">${esc(c.type)}</td><td class="comp-count">${c.count}</td><td>${esc(c.description)}</td><td class="comp-bom">${esc(c.bomId)}</td></tr>`
                    )
                    .join("")}
                </table>`
                  : ""
              }
              ${f.notes ? `<div class="notes">${esc(f.notes)}</div>` : ""}
            </div>
          </div>
          ${
            otherImages.length > 0
              ? `<div class="gallery">${otherImages
                  .map(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (img: any) =>
                      `<img class="gallery-img" src="${img.imageUrl}" alt="${esc(img.caption || f.name)}" />`
                  )
                  .join("")}</div>`
              : ""
          }
        </div>`;
          }
        )
        .join("")}
    </div>`;
  }

  // Build PP sections HTML
  let ppSectionsHTML = "";
  for (const section of ppSections) {
    const sectionItems = ppBySection.get(section.id) || [];
    if (sectionItems.length === 0) continue;

    ppSectionsHTML += `
    <div class="section">
      <div class="section-header" style="background:${esc(section.color)}">
        ${esc(section.name)} <span class="count">(${sectionItems.length})</span>
      </div>
      <table class="pp-table">
        <thead><tr><th></th><th>Namn</th><th>Antal</th><th>BOM</th><th>Anteckning</th></tr></thead>
        <tbody>
        ${sectionItems
          .map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p: any) => `
          <tr class="${p.checked ? "checked" : ""}">
            <td class="pp-check">${p.checked ? "✅" : "⬜"}</td>
            <td class="pp-name">
              ${p.colorImage
                ? `<img class="pp-color" src="${p.colorImage}" />`
                : isAdvancedPattern(p.colorPattern)
                  ? buildAdvancedPatternSVG(p.colorPattern, p.type, p.length, p.width)
                  : buildColorPatternSVG(p.colorPattern, p.type, p.length, p.width)}
              ${esc(p.name)}
            </td>
            <td class="pp-count">${p.count}</td>
            <td class="pp-bom">${esc(p.bomId)}</td>
            <td class="pp-note">${esc(p.note)}</td>
          </tr>`
          )
          .join("")}
        </tbody>
      </table>
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GHS Hinderinventering — Export ${exportDate}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f0f2f5;color:#333;line-height:1.5}
.header{background:linear-gradient(135deg,#0a1628,#1a3a6e,#2F5496);color:#fff;padding:24px 20px;text-align:center}
.header h1{font-size:1.4em;margin-bottom:4px}
.header p{font-size:0.8em;opacity:0.7}
.header .export-date{margin-top:8px;font-size:0.75em;opacity:0.5}
.container{max-width:900px;margin:0 auto;padding:16px}
.stats{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.stat{flex:1;min-width:80px;background:#fff;border-radius:10px;padding:12px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.06)}
.stat .val{font-size:1.4em;font-weight:700}
.stat .lbl{font-size:0.7em;text-transform:uppercase;color:#999;letter-spacing:0.5px}
.tab-title{font-size:1.1em;font-weight:700;color:#1a3a6e;margin:24px 0 12px;padding-bottom:6px;border-bottom:2px solid #2F5496}
.section{margin-bottom:16px}
.section-header{color:#fff;font-weight:700;font-size:0.9em;padding:8px 14px;border-radius:10px 10px 0 0}
.section-header .count{opacity:0.7;font-weight:400}
.card{background:#fff;border-left:4px solid #2F5496;margin-bottom:2px;padding:10px 12px}
.card.checked{border-left-color:#27ae60;background:#f6fdf8}
.card-top{display:flex;gap:12px}
.card-img{width:160px;height:120px;object-fit:contain;border-radius:6px;flex-shrink:0;background:#f0f2f5}
.card-img.placeholder{display:flex;align-items:center;justify-content:center;background:#e8eef7;color:#6688bb;font-size:0.8em}
.card-info{flex:1;min-width:0}
.card-title{font-weight:700;font-size:0.95em;margin-bottom:6px}
.card-title .check{margin-right:6px}
.comp-table{width:100%;font-size:0.82em;border-collapse:collapse}
.comp-table td{padding:2px 6px;border-bottom:1px solid #f0f0f0}
.comp-type{font-weight:600;color:#666;width:70px}
.comp-count{width:40px;text-align:center;font-weight:600}
.comp-bom{width:50px;text-align:right;color:#999;font-size:0.9em}
.notes{margin-top:6px;font-size:0.82em;color:#666;font-style:italic;padding:4px 8px;background:#fafafa;border-radius:4px}
.gallery{display:flex;gap:6px;padding:8px 0 4px;overflow-x:auto}
.gallery-img{height:60px;border-radius:4px;object-fit:cover}
.pp-table{width:100%;background:#fff;border-collapse:collapse;font-size:0.85em}
.pp-table th{text-align:left;padding:6px 8px;background:#f5f5f5;font-size:0.8em;color:#666;text-transform:uppercase}
.pp-table td{padding:5px 8px;border-bottom:1px solid #f0f0f0}
.pp-table tr.checked{background:#f6fdf8}
.pp-check{width:30px;text-align:center}
.pp-name{font-weight:600;white-space:nowrap}
.pp-color{height:14px;width:80px;object-fit:contain;vertical-align:middle;margin-right:6px;border-radius:2px}
.pp-count{width:50px;text-align:center;font-weight:600}
.pp-bom{width:60px;color:#666}
.pp-note{color:#888;font-size:0.9em}
.footer{text-align:center;padding:24px;font-size:0.75em;color:#999}
@media print{body{background:#fff}.header{padding:16px}.container{padding:8px}.card-img{width:120px;height:80px}}
@media(max-width:600px){.card-top{flex-direction:column}.card-img{width:100%;height:auto;max-height:200px}}
</style>
</head>
<body>
<div class="header">
  <h1>GHS — Hinderinventering</h1>
  <p>Gothenburg Horse Show</p>
  <div class="export-date">Exporterad: ${esc(exportDate)}</div>
</div>
<div class="container">
  <div class="stats">
    <div class="stat"><div class="val" style="color:#2F5496">${stats.fenceTotal}</div><div class="lbl">Hinder</div></div>
    <div class="stat"><div class="val" style="color:#27ae60">${stats.fenceChecked}</div><div class="lbl">Klara</div></div>
    <div class="stat"><div class="val" style="color:#e74c3c">${stats.fenceTotal - stats.fenceChecked}</div><div class="lbl">Kvar</div></div>
    <div class="stat"><div class="val" style="color:#b8860b">${stats.totalWings}</div><div class="lbl">Wings</div></div>
    <div class="stat"><div class="val" style="color:#b8860b">${stats.ppTotal}</div><div class="lbl">Bommar</div></div>
    <div class="stat"><div class="val" style="color:#27ae60">${stats.ppChecked}</div><div class="lbl">Bommar klara</div></div>
  </div>

  <div class="tab-title">🏇 Hinder</div>
  ${fenceSectionsHTML}

  <div class="tab-title">📏 Poles &amp; Planks</div>
  ${ppSectionsHTML}
</div>
<div class="footer">
  GHS Hinderinventering — Exporterad ${esc(exportDate)}<br>
  Genererad fran ghs-hinder-app.vercel.app
</div>
</body>
</html>`;
}
