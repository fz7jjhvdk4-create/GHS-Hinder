import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const [fenceResult, ppResult] = await Promise.all([
      prisma.fence.updateMany({ data: { checked: false } }),
      prisma.poleOrPlank.updateMany({ data: { checked: false } }),
    ]);

    return NextResponse.json({
      success: true,
      fences: fenceResult.count,
      pp: ppResult.count,
    });
  } catch (error) {
    console.error("Error resetting inventory:", error);
    return NextResponse.json(
      { error: "Failed to reset inventory" },
      { status: 500 }
    );
  }
}
