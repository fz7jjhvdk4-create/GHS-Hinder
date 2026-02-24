import { NextRequest, NextResponse } from "next/server";
import { validatePin, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin } = body;

    if (!pin || typeof pin !== "string") {
      return NextResponse.json(
        { error: "PIN krävs" },
        { status: 400 }
      );
    }

    if (!validatePin(pin)) {
      return NextResponse.json(
        { error: "Fel kod" },
        { status: 401 }
      );
    }

    await createSession();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Något gick fel" },
      { status: 500 }
    );
  }
}
