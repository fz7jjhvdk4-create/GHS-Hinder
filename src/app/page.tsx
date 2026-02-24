import { prisma } from "@/lib/db";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [fenceCount, ppCount, sectionCount, componentCount, imageCount] =
    await Promise.all([
      prisma.fence.count(),
      prisma.poleOrPlank.count(),
      prisma.section.count(),
      prisma.fenceComponent.count(),
      prisma.fenceImage.count(),
    ]);

  const sections = await prisma.section.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: { fences: true, polesOrPlanks: true },
      },
    },
  });

  return (
    <div className="min-h-[100dvh] bg-[#f0f2f5]">
      {/* Header */}
      <header className="flex items-center justify-center gap-4 rounded-b-xl bg-gradient-to-br from-[#0a1628] via-[#1a3a6e] to-[#2F5496] px-5 py-4 text-white shadow-lg">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20">
          <span className="text-2xl">🏇</span>
        </div>
        <div className="text-center">
          <h1 className="text-lg font-bold leading-tight sm:text-xl">
            GHS 2026 — Hinderförteckning
          </h1>
          <p className="text-xs text-white/70">Gothenburg Horse Show</p>
        </div>
        <LogoutButton />
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-3 py-6 sm:px-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
          {[
            { label: "Sektioner", value: sectionCount, icon: "📋" },
            { label: "Hinder", value: fenceCount, icon: "🏇" },
            { label: "Komponenter", value: componentCount, icon: "🔧" },
            { label: "Bilder", value: imageCount, icon: "📷" },
            { label: "Poles & Planks", value: ppCount, icon: "📏" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-white p-3 text-center shadow-sm"
            >
              <div className="text-xl">{stat.icon}</div>
              <div className="mt-0.5 text-xl font-bold text-[#1a3a6e]">
                {stat.value}
              </div>
              <div className="text-[10px] text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Sections list */}
        <h2 className="mt-8 mb-3 text-base font-bold text-[#1a3a6e]">
          Sektioner
        </h2>
        <div className="space-y-1.5">
          {sections.map((section) => (
            <div
              key={section.id}
              className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: section.color }}
                />
                <span className="text-sm font-medium text-gray-800">
                  {section.name}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                  {section.type === "fence" ? "Hinder" : "P&P"}
                </span>
              </div>
              <span className="text-xs font-medium text-gray-400">
                {section.type === "fence"
                  ? `${section._count.fences} st`
                  : `${section._count.polesOrPlanks} st`}
              </span>
            </div>
          ))}
        </div>

        {/* Status */}
        <div className="mt-8 rounded-xl bg-white p-5 text-center shadow-sm">
          <div className="text-3xl">✅</div>
          <h3 className="mt-2 text-sm font-bold text-green-700">
            Databasen är redo!
          </h3>
          <p className="mt-1 text-xs text-gray-400">
            US-001 &amp; US-002 klara — Schema, seed &amp; PIN-autentisering
          </p>
        </div>
      </div>
    </div>
  );
}
