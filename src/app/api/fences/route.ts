import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, sectionId } = body;

    if (!name || !sectionId) {
      return NextResponse.json(
        { error: "name and sectionId are required" },
        { status: 400 }
      );
    }

    const maxSort = await prisma.fence.aggregate({
      _max: { sortOrder: true },
    });

    const fence = await prisma.fence.create({
      data: {
        name,
        sectionId,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
      include: {
        section: true,
        images: { orderBy: { sortOrder: "asc" } },
        components: true,
      },
    });

    return NextResponse.json(fence, { status: 201 });
  } catch (error) {
    console.error("Error creating fence:", error);
    return NextResponse.json(
      { error: "Failed to create fence" },
      { status: 500 }
    );
  }
}
