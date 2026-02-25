import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// POST - Reorder sections
export async function POST(request: NextRequest) {
  try {
    const { sectionIds } = await request.json();

    if (!Array.isArray(sectionIds)) {
      return NextResponse.json(
        { error: "sectionIds array is required" },
        { status: 400 }
      );
    }

    await Promise.all(
      sectionIds.map((id: string, index: number) =>
        prisma.section.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering sections:", error);
    return NextResponse.json(
      { error: "Failed to reorder sections" },
      { status: 500 }
    );
  }
}
