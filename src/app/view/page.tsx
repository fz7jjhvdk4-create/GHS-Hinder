import { prisma } from "@/lib/db";
import { Metadata } from "next";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "GHS Hinderinventering — Publik vy",
  description: "Gothenburg Horse Show — Hinderinventering (skrivskyddad)",
};

interface FenceWithRelations {
  id: string;
  name: string;
  checked: boolean;
  notes: string;
  sectionId: string;
  section: { id: string; name: string; color: string };
  images: { id: string; imageUrl: string; caption: string; isPrimary: boolean; sortOrder: number }[];
  components: { id: string; type: string; count: number; description: string; bomId: string }[];
}

interface ColorSegment {
  color: string;
  percent: number;
}

interface PPWithRelation {
  id: string;
  name: string;
  checked: boolean;
  note: string;
  count: number;
  bomId: string;
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  colorPattern: any;
  colorImage: string;
  length: number;
  width: number;
  sectionId: string;
  section: { id: string; name: string; color: string };
}

interface Section {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
}

export default async function PublicViewPage() {
  const [fences, fenceSections, ppItems, ppSections] = await Promise.all([
    prisma.fence.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        section: true,
        images: { orderBy: { sortOrder: "asc" } },
        components: true,
      },
    }) as Promise<FenceWithRelations[]>,
    prisma.section.findMany({
      where: { type: "fence" },
      orderBy: { sortOrder: "asc" },
    }) as Promise<Section[]>,
    prisma.poleOrPlank.findMany({
      orderBy: { sortOrder: "asc" },
      include: { section: true },
    }) as Promise<PPWithRelation[]>,
    prisma.section.findMany({
      where: { type: "pp" },
      orderBy: { sortOrder: "asc" },
    }) as Promise<Section[]>,
  ]);

  // Stats
  const fenceTotal = fences.length;
  const fenceChecked = fences.filter((f) => f.checked).length;
  const totalWings = fences.reduce((sum, f) => {
    const w = f.components.find((c) => c.type.toLowerCase() === "wings");
    return sum + (w?.count ?? 0);
  }, 0);
  const ppTotal = ppItems.length;
  const ppChecked = ppItems.filter((p) => p.checked).length;

  // Group fences by section
  const fencesBySection = new Map<string, FenceWithRelations[]>();
  for (const f of fences) {
    if (!fencesBySection.has(f.sectionId)) fencesBySection.set(f.sectionId, []);
    fencesBySection.get(f.sectionId)!.push(f);
  }

  // Group PP by section
  const ppBySection = new Map<string, PPWithRelation[]>();
  for (const p of ppItems) {
    if (!ppBySection.has(p.sectionId)) ppBySection.set(p.sectionId, []);
    ppBySection.get(p.sectionId)!.push(p);
  }

  const now = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" });

  return (
    <div className="min-h-screen bg-[#f0f2f5]" style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" }}>
      {/* Header */}
      <header className="bg-gradient-to-br from-[#0a1628] via-[#1a3a6e] to-[#2F5496] px-5 py-6 text-center text-white print:py-4">
        <h1 className="text-xl font-bold">GHS — Hinderinventering</h1>
        <p className="text-sm opacity-70">Gothenburg Horse Show</p>
        <p className="mt-2 text-xs opacity-40">Uppdaterad: {now}</p>
      </header>

      <div className="mx-auto max-w-[900px] p-4">
        {/* Stats */}
        <div className="mb-4 flex flex-wrap gap-2">
          <StatBox value={fenceTotal} label="Hinder" color="#2F5496" />
          <StatBox value={fenceChecked} label="Klara" color="#27ae60" />
          <StatBox value={fenceTotal - fenceChecked} label="Kvar" color="#e74c3c" />
          <StatBox value={totalWings} label="Wings" color="#b8860b" />
          <StatBox value={ppTotal} label="Bommar" color="#b8860b" />
          <StatBox value={ppChecked} label="Bommar klara" color="#27ae60" />
        </div>

        {/* Print button */}
        <div className="mb-4 text-right print:hidden">
          <PrintButton />
        </div>

        {/* Fences */}
        <h2 className="mb-3 border-b-2 border-[#2F5496] pb-1.5 text-lg font-bold text-[#1a3a6e]">
          🏇 Hinder
        </h2>

        {fenceSections.map((section) => {
          const sectionFences = fencesBySection.get(section.id) || [];
          if (sectionFences.length === 0) return null;
          return (
            <div key={section.id} className="mb-4">
              <div
                className="rounded-t-lg px-3.5 py-2 text-sm font-bold text-white"
                style={{ background: section.color }}
              >
                {section.name} <span className="font-normal opacity-70">({sectionFences.length})</span>
              </div>
              {sectionFences.map((f) => (
                <div
                  key={f.id}
                  className={`border-b border-gray-100 bg-white px-3 py-2.5 ${
                    f.checked ? "border-l-4 border-l-[#27ae60] bg-[#f6fdf8]" : "border-l-4 border-l-[#2F5496]"
                  }`}
                >
                  <div className="flex gap-3 max-[600px]:flex-col">
                    {/* Image */}
                    {f.images.length > 0 ? (
                      <img
                        src={f.images.find((i) => i.isPrimary)?.imageUrl || f.images[0].imageUrl}
                        alt={f.name}
                        className="h-[100px] w-[140px] shrink-0 rounded-md object-cover max-[600px]:h-auto max-[600px]:max-h-[200px] max-[600px]:w-full print:h-[70px] print:w-[100px]"
                      />
                    ) : (
                      <div className="flex h-[100px] w-[140px] shrink-0 items-center justify-center rounded-md bg-[#e8eef7] text-xs text-[#6688bb] max-[600px]:w-full">
                        Ingen bild
                      </div>
                    )}

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 text-[0.95em] font-bold">
                        <span className="mr-1.5">{f.checked ? "✅" : "⬜"}</span>
                        {f.name}
                      </div>

                      {f.components.length > 0 && (
                        <table className="w-full border-collapse text-[0.82em]">
                          <tbody>
                            {f.components.map((c) => (
                              <tr key={c.id}>
                                <td className="w-[70px] border-b border-gray-100 px-1.5 py-0.5 font-semibold text-gray-600">
                                  {c.type}
                                </td>
                                <td className="w-[40px] border-b border-gray-100 px-1.5 py-0.5 text-center font-semibold">
                                  {c.count}
                                </td>
                                <td className="border-b border-gray-100 px-1.5 py-0.5 text-gray-600">
                                  {c.description}
                                </td>
                                <td className="w-[50px] border-b border-gray-100 px-1.5 py-0.5 text-right text-[0.9em] text-gray-400">
                                  {c.bomId}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {f.notes && (
                        <div className="mt-1.5 rounded bg-[#fafafa] px-2 py-1 text-[0.82em] italic text-gray-500">
                          {f.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Extra images */}
                  {f.images.length > 1 && (
                    <div className="mt-2 flex gap-1.5 overflow-x-auto">
                      {f.images.slice(1).map((img) => (
                        <img
                          key={img.id}
                          src={img.imageUrl}
                          alt={img.caption || f.name}
                          className="h-[60px] rounded object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}

        {/* Poles & Planks */}
        <h2 className="mb-3 mt-6 border-b-2 border-[#b8860b] pb-1.5 text-lg font-bold text-[#1a3a6e]">
          📏 Poles &amp; Planks
        </h2>

        {ppSections.map((section) => {
          const sectionItems = ppBySection.get(section.id) || [];
          if (sectionItems.length === 0) return null;
          return (
            <div key={section.id} className="mb-4">
              <div
                className="rounded-t-lg px-3.5 py-2 text-sm font-bold text-white"
                style={{ background: section.color }}
              >
                {section.name} <span className="font-normal opacity-70">({sectionItems.length})</span>
              </div>
              <table className="w-full border-collapse bg-white text-[0.85em]">
                <thead>
                  <tr>
                    <th className="w-[30px] bg-gray-50 px-2 py-1.5 text-left text-[0.8em] uppercase text-gray-500"></th>
                    <th className="bg-gray-50 px-2 py-1.5 text-left text-[0.8em] uppercase text-gray-500">Namn</th>
                    <th className="w-[50px] bg-gray-50 px-2 py-1.5 text-center text-[0.8em] uppercase text-gray-500">Antal</th>
                    <th className="w-[60px] bg-gray-50 px-2 py-1.5 text-left text-[0.8em] uppercase text-gray-500">BOM</th>
                    <th className="bg-gray-50 px-2 py-1.5 text-left text-[0.8em] uppercase text-gray-500">Anteckning</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionItems.map((p) => (
                    <tr key={p.id} className={p.checked ? "bg-[#f6fdf8]" : ""}>
                      <td className="border-b border-gray-100 px-2 py-1.5 text-center">{p.checked ? "✅" : "⬜"}</td>
                      <td className="border-b border-gray-100 px-2 py-1.5 font-semibold whitespace-nowrap">
                        {p.colorImage ? (
                          <img
                            src={p.colorImage}
                            alt=""
                            className="mr-1.5 inline-block h-3.5 w-[80px] rounded-sm object-contain align-middle"
                          />
                        ) : (
                          <ColorPatternSVGInline colorPattern={p.colorPattern} type={p.type} length={p.length} width={p.width} />
                        )}
                        {p.name}
                      </td>
                      <td className="border-b border-gray-100 px-2 py-1.5 text-center font-semibold">{p.count}</td>
                      <td className="border-b border-gray-100 px-2 py-1.5 text-gray-600">{p.bomId}</td>
                      <td className="border-b border-gray-100 px-2 py-1.5 text-[0.9em] text-gray-500">{p.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-gray-400 print:py-3">
        GHS Hinderinventering — Uppdaterad {now}
      </footer>
    </div>
  );
}

let cpCounter = 0;
function ColorPatternSVGInline({ colorPattern, type, length, width }: { colorPattern: ColorSegment[]; type: string; length: number; width: number }) {
  if (!Array.isArray(colorPattern) || colorPattern.length === 0) return null;
  const clipId = `cp-${++cpCounter}`;
  const maxWidth = 80;
  const lengthScale = length / 3.2;
  const svgWidth = Math.round(maxWidth * lengthScale);
  let svgHeight: number;
  if (type === "gate") svgHeight = 24;
  else if (width >= 0.2) svgHeight = 12;
  else svgHeight = 8;

  let cumPercent = 0;
  const segments = colorPattern.map((seg) => {
    const x = Math.round((cumPercent / 100) * svgWidth);
    cumPercent += seg.percent;
    const xEnd = Math.round((cumPercent / 100) * svgWidth);
    return { x, w: xEnd - x, color: seg.color };
  });

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="mr-1.5 inline-block rounded-sm align-middle"
    >
      <clipPath id={clipId}>
        <rect x={0} y={0} width={svgWidth} height={svgHeight} rx={1} ry={1} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        {segments.map((seg, i) => (
          <rect key={i} x={seg.x} y={0} width={seg.w} height={svgHeight} fill={seg.color} />
        ))}
      </g>
      <rect x={0.5} y={0.5} width={svgWidth - 1} height={svgHeight - 1} fill="none" stroke="#94a3b8" strokeWidth={0.5} rx={1} ry={1} />
    </svg>
  );
}

function StatBox({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="min-w-[80px] flex-1 rounded-lg bg-white p-3 text-center shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
      <div className="text-[0.7em] uppercase tracking-wider text-gray-400">{label}</div>
    </div>
  );
}
