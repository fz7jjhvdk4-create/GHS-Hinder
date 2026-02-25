import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// POST - Create a new section
export async function POST(request: NextRequest) {
  try {
    const { name, color, type } = await request.json();

    if (!name || !type) {
      return NextResponse.json(
        { error: "name and type are required" },
        { status: 400 }
      );
    }

    // Get max sortOrder for this type
    const maxSort = await prisma.section.aggregate({
      where: { type },
      _max: { sortOrder: true },
    });

    const section = await prisma.section.create({
      data: {
        name,
        color: color || "#2F5496",
        type,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error("Error creating section:", error);
    return NextResponse.json(
      { error: "Failed to create section" },
      { status: 500 }
    );
  }
}
