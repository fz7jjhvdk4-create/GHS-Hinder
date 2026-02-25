import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// POST - Reorder images for a fence
export async function POST(request: NextRequest) {
  try {
    const { imageIds } = await request.json();

    if (!Array.isArray(imageIds)) {
      return NextResponse.json(
        { error: "imageIds array is required" },
        { status: 400 }
      );
    }

    // Update sort order for each image
    await Promise.all(
      imageIds.map((id: string, index: number) =>
        prisma.fenceImage.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering images:", error);
    return NextResponse.json(
      { error: "Failed to reorder images" },
      { status: 500 }
    );
  }
}
