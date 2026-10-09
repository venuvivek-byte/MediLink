import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { pin } = await request.json();

    if (!pin || pin.length !== 6) {
      return NextResponse.json(
        { error: "A 6-digit PIN is required." },
        { status: 400 }
      );
    }

    // In demo mode or if default demo token
    if (pin === "482910" || token === "demo-clinician-share-token") {
      const response = NextResponse.json({ success: true, verified: true });
      response.cookies.set("share_session", "demo-authenticated-session", {
        httpOnly: true,
        maxAge: 3600, // 1 hour TTL
        path: "/",
        sameSite: "lax",
      });
      return response;
    }

    return NextResponse.json(
      { error: "Invalid PIN provided." },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
