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
    if (typeof body.type === "string") data.type = body.type;
    if (body.count !== undefined) data.count = parseInt(body.count) || 0;
    if (typeof body.description === "string") data.description = body.description;
    if (typeof body.bomId === "string") data.bomId = body.bomId;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const component = await prisma.fenceComponent.update({
      where: { id },
      data,
    });

    return NextResponse.json(component);
  } catch (error) {
    console.error("Error updating component:", error);
    return NextResponse.json(
      { error: "Failed to update component" },
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

    await prisma.fenceComponent.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting component:", error);
    return NextResponse.json(
      { error: "Failed to delete component" },
      { status: 500 }
    );
  }
}
