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
    if (typeof body.note === "string") data.note = body.note;
    if (typeof body.count === "number") data.count = body.count;
    if (typeof body.bomId === "string") data.bomId = body.bomId;
    if (typeof body.sectionId === "string") data.sectionId = body.sectionId;
    if (typeof body.name === "string") data.name = body.name;
    if (Array.isArray(body.colorPattern)) data.colorPattern = body.colorPattern;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const item = await prisma.poleOrPlank.update({
      where: { id },
      data,
      include: { section: true },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error updating pole/plank:", error);
    return NextResponse.json(
      { error: "Failed to update pole/plank" },
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
    await prisma.poleOrPlank.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pole/plank:", error);
    return NextResponse.json(
      { error: "Failed to delete pole/plank" },
      { status: 500 }
    );
  }
}
