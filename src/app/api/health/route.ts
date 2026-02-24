import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [fenceCount, ppCount, sectionCount] = await Promise.all([
      prisma.fence.count(),
      prisma.poleOrPlank.count(),
      prisma.section.count(),
    ]);

    return NextResponse.json({
      status: "ok",
      database: "connected",
      counts: {
        sections: sectionCount,
        fences: fenceCount,
        polesOrPlanks: ppCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
