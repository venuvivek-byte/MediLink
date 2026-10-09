import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { PIN_PATTERN } from "@/lib/sharing/policy";
import { createShareSessionCookie, resolveShareToken, verifySharePin } from "@/lib/sharing/public-access";

const bodySchema = z.object({ pin: z.string().regex(PIN_PATTERN) });

// One generic message for unknown token, inactive share and wrong PIN, so the
// response does not reveal which part was wrong.
const DENIED = { error: "This link or PIN is not valid." };

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter the 6-digit PIN." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit PIN." }, { status: 400 });
  }

  const share = resolveShareToken(token);
  if (!share || !verifySharePin(share, parsed.data.pin)) {
    return NextResponse.json(DENIED, { status: 401 });
  }

  const cookie = createShareSessionCookie(share, token);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
