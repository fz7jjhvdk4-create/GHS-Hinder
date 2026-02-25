import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await prisma.poleOrPlank.findMany({
      orderBy: { sortOrder: "asc" },
      include: { section: true },
    });

    const sections = await prisma.section.findMany({
      where: { type: "pp" },
      orderBy: { sortOrder: "asc" },
    });

    const total = items.length;
    const checked = items.filter((i) => i.checked).length;

    return NextResponse.json({
      items,
      sections,
      stats: {
        total,
        checked,
        remaining: total - checked,
      },
    });
  } catch (error) {
    console.error("Error fetching poles/planks:", error);
    return NextResponse.json(
      { error: "Failed to fetch poles/planks" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, sectionId, type = "pole", length = 2.5, width = 0.1 } = body;

    if (!name || !sectionId) {
      return NextResponse.json(
        { error: "name and sectionId are required" },
        { status: 400 }
      );
    }

    const maxSort = await prisma.poleOrPlank.aggregate({
      _max: { sortOrder: true },
    });

    const item = await prisma.poleOrPlank.create({
      data: {
        name,
        sectionId,
        type,
        length,
        width,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
      include: { section: true },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating pole/plank:", error);
    return NextResponse.json(
      { error: "Failed to create pole/plank" },
      { status: 500 }
    );
  }
}
