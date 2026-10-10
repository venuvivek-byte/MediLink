import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { PIN_PATTERN } from "@/lib/sharing/policy";
import { clientInfoFrom, createShareSessionCookie, verifySharePin } from "@/lib/sharing/public-access";

const bodySchema = z.object({ pin: z.string().regex(PIN_PATTERN) });

// One generic message for unknown token, inactive share and wrong PIN, so the
// response does not reveal which part was wrong. "Locked" is reported: anyone
// who can reach the PIN form already knows the link exists.
const DENIED = { error: "This link or PIN is not valid." };
const LOCKED = {
  error: "Too many incorrect PINs. Try again in 15 minutes, or ask the patient for a new link.",
};
const UNAVAILABLE = { error: "The PIN could not be checked right now. Please try again." };

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

  let result;
  try {
    result = await verifySharePin(token, parsed.data.pin, clientInfoFrom(request.headers));
  } catch (error) {
    console.error((error as Error).message);
    return NextResponse.json(UNAVAILABLE, { status: 503 });
  }
  if (!result.ok) {
    return result.reason === "locked"
      ? NextResponse.json(LOCKED, { status: 429 })
      : NextResponse.json(DENIED, { status: 401 });
  }

  const cookie = createShareSessionCookie(result.share, token);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
