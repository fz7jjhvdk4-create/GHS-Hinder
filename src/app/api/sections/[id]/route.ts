import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// PATCH - Update section (name, color)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.color !== undefined) data.color = body.color;

    const section = await prisma.section.update({
      where: { id },
      data,
    });

    return NextResponse.json(section);
  } catch (error) {
    console.error("Error updating section:", error);
    return NextResponse.json(
      { error: "Failed to update section" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a section (only if empty)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if section has fences
    const fenceCount = await prisma.fence.count({ where: { sectionId: id } });
    if (fenceCount > 0) {
      return NextResponse.json(
        { error: "Sektionen innehaller hinder. Flytta dem forst." },
        { status: 400 }
      );
    }

    // Check if section has poles/planks
    const ppCount = await prisma.poleOrPlank.count({ where: { sectionId: id } });
    if (ppCount > 0) {
      return NextResponse.json(
        { error: "Sektionen innehaller bommar/plankor. Flytta dem forst." },
        { status: 400 }
      );
    }

    await prisma.section.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting section:", error);
    return NextResponse.json(
      { error: "Failed to delete section" },
      { status: 500 }
    );
  }
}
