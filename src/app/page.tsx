import { prisma } from "@/lib/db";

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
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* Header */}
      <header className="bg-[#2F5496] px-6 py-8 text-center shadow-lg">
        <h1 className="text-3xl font-bold tracking-tight">
          🏇 GHS Hinderinventering
        </h1>
        <p className="mt-2 text-blue-200">
          Gothenburg Horse Show 2026
        </p>
      </header>

      {/* Stats */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            { label: "Sektioner", value: sectionCount, icon: "📋" },
            { label: "Hinder", value: fenceCount, icon: "🏇" },
            { label: "Komponenter", value: componentCount, icon: "🔧" },
            { label: "Bilder", value: imageCount, icon: "📷" },
            { label: "Poles & Planks", value: ppCount, icon: "📏" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-white/10 p-4 text-center backdrop-blur"
            >
              <div className="text-2xl">{stat.icon}</div>
              <div className="mt-1 text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-blue-200">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Sections */}
        <h2 className="mt-10 mb-4 text-xl font-semibold">Sektioner</h2>
        <div className="space-y-2">
          {sections.map((section) => (
            <div
              key={section.id}
              className="flex items-center justify-between rounded-lg p-3"
              style={{ backgroundColor: section.color + "33" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: section.color }}
                />
                <span className="font-medium">{section.name}</span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                  {section.type === "fence" ? "Hinder" : "Poles & Planks"}
                </span>
              </div>
              <span className="text-sm text-blue-200">
                {section.type === "fence"
                  ? `${section._count.fences} hinder`
                  : `${section._count.polesOrPlanks} poster`}
              </span>
            </div>
          ))}
        </div>

        {/* Status */}
        <div className="mt-10 rounded-xl bg-green-900/30 p-6 text-center">
          <div className="text-3xl">✅</div>
          <h3 className="mt-2 text-lg font-semibold text-green-300">
            Databasen är redo!
          </h3>
          <p className="mt-1 text-sm text-green-200/70">
            US-001 — Databasschema och projektsetup klar. All data importerad
            från HTML-prototypen.
          </p>
        </div>
      </div>
    </div>
  );
}
