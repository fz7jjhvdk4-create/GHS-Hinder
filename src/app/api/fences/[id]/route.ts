import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (typeof body.checked === "boolean") data.checked = body.checked;
    if (typeof body.notes === "string") data.notes = body.notes;
    if (typeof body.sectionId === "string") data.sectionId = body.sectionId;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const fence = await prisma.fence.update({
      where: { id },
      data,
    });

    return NextResponse.json(fence);
  } catch (error) {
    console.error("Error updating fence:", error);
    return NextResponse.json(
      { error: "Failed to update fence" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete related records first (cascade not automatic for all)
    await prisma.fenceImage.deleteMany({ where: { fenceId: id } });
    await prisma.fenceComponent.deleteMany({ where: { fenceId: id } });
    await prisma.fence.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting fence:", error);
    return NextResponse.json(
      { error: "Failed to delete fence" },
      { status: 500 }
    );
  }
}
