import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fenceId, type, count, description, bomId } = body;

    if (!fenceId || !type) {
      return NextResponse.json(
        { error: "fenceId and type are required" },
        { status: 400 }
      );
    }

    const component = await prisma.fenceComponent.create({
      data: {
        fenceId,
        type,
        count: parseInt(count) || 0,
        description: description || "",
        bomId: bomId || "",
      },
    });

    return NextResponse.json(component, { status: 201 });
  } catch (error) {
    console.error("Error creating component:", error);
    return NextResponse.json(
      { error: "Failed to create component" },
      { status: 500 }
    );
  }
}
