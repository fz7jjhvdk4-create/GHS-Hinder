import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const fences = await prisma.fence.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        section: true,
        images: {
          orderBy: { sortOrder: "asc" },
        },
        components: true,
      },
    });

    const sections = await prisma.section.findMany({
      where: { type: "fence" },
      orderBy: { sortOrder: "asc" },
    });

    // Calculate stats
    const totalFences = fences.length;
    const checkedFences = fences.filter((f) => f.checked).length;
    const totalWings = fences.reduce((sum, f) => {
      const wingsComp = f.components.find(
        (c) => c.type.toLowerCase() === "wings"
      );
      return sum + (wingsComp?.count ?? 0);
    }, 0);

    return NextResponse.json({
      fences,
      sections,
      stats: {
        total: totalFences,
        checked: checkedFences,
        remaining: totalFences - checkedFences,
        wings: totalWings,
      },
    });
  } catch (error) {
    console.error("Error fetching fences:", error);
    return NextResponse.json(
      { error: "Failed to fetch fences" },
      { status: 500 }
    );
  }
}
