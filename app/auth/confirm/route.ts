import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getConfig } from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";

// Email confirmation link target. The Supabase "Confirm signup" email
// template must link to:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
//
// Only fixed in-app destinations are used, so the link cannot be turned into
// an open redirect.

const querySchema = z.object({
  token_hash: z.string().min(1).max(512),
  type: z.enum(["signup", "email"]),
});

export async function GET(request: NextRequest) {
  const loginWith = (error: string) => {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", error);
    return NextResponse.redirect(url);
  };

  if (getConfig().mode === "demo") return loginWith("demo_mode");

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return loginWith("confirmation_failed");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: parsed.data.type,
    token_hash: parsed.data.token_hash,
  });
  if (error) return loginWith("confirmation_failed");

  return NextResponse.redirect(new URL("/", request.url));
}
