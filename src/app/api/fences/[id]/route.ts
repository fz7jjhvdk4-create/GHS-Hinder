import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Only allow updating checked and notes
    const data: Record<string, unknown> = {};
    if (typeof body.checked === "boolean") data.checked = body.checked;
    if (typeof body.notes === "string") data.notes = body.notes;

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
