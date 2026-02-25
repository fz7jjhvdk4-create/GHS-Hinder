import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// POST - Upload a new image for a fence
export async function POST(request: NextRequest) {
  try {
    const { fenceId, imageData, caption } = await request.json();

    if (!fenceId || !imageData) {
      return NextResponse.json(
        { error: "fenceId and imageData are required" },
        { status: 400 }
      );
    }

    // Check how many images this fence already has
    const existingCount = await prisma.fenceImage.count({
      where: { fenceId },
    });

    // If this is the first image, make it primary
    const isPrimary = existingCount === 0;

    const image = await prisma.fenceImage.create({
      data: {
        fenceId,
        imageUrl: imageData,
        caption: caption || "",
        isPrimary,
        sortOrder: existingCount,
      },
    });

    return NextResponse.json(image, { status: 201 });
  } catch (error) {
    console.error("Error creating image:", error);
    return NextResponse.json(
      { error: "Failed to create image" },
      { status: 500 }
    );
  }
}
