import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// PATCH - Update image (caption, isPrimary)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.caption !== undefined) data.caption = body.caption;

    if (body.isPrimary === true) {
      // Get fenceId for this image
      const img = await prisma.fenceImage.findUnique({
        where: { id },
        select: { fenceId: true },
      });
      if (!img) {
        return NextResponse.json(
          { error: "Image not found" },
          { status: 404 }
        );
      }

      // Unset all other images as primary for this fence
      await prisma.fenceImage.updateMany({
        where: { fenceId: img.fenceId },
        data: { isPrimary: false },
      });
      data.isPrimary = true;
    }

    const image = await prisma.fenceImage.update({
      where: { id },
      data,
    });

    return NextResponse.json(image);
  } catch (error) {
    console.error("Error updating image:", error);
    return NextResponse.json(
      { error: "Failed to update image" },
      { status: 500 }
    );
  }
}

// DELETE - Remove an image
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the image to check if it's primary
    const image = await prisma.fenceImage.findUnique({
      where: { id },
      select: { fenceId: true, isPrimary: true },
    });

    if (!image) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    await prisma.fenceImage.delete({ where: { id } });

    // If deleted image was primary, set the first remaining image as primary
    if (image.isPrimary) {
      const firstRemaining = await prisma.fenceImage.findFirst({
        where: { fenceId: image.fenceId },
        orderBy: { sortOrder: "asc" },
      });
      if (firstRemaining) {
        await prisma.fenceImage.update({
          where: { id: firstRemaining.id },
          data: { isPrimary: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
