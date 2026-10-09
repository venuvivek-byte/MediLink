import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getConfig } from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";

// Return URL for Google OAuth and for email-confirmation links (?flow=email).
// Supabase uses the PKCE flow: the code is only redeemable together with the
// verifier cookie set in the browser that started the sign-in, so a stolen
// callback URL is useless elsewhere.
// Always redirects to fixed in-app paths (no `next` parameter: no open redirect).
//
// Email links: Supabase verifies the address BEFORE redirecting here. So if
// the code cannot be exchanged (e.g. the link was opened on another device),
// the email is still confirmed and the user only needs to sign in.

const codeSchema = z.string().min(1).max(512);

export async function GET(request: NextRequest) {
  const loginWith = (error: string) => {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", error);
    return NextResponse.redirect(url);
  };

  if (getConfig().mode === "demo") return loginWith("demo_mode");

  const params = request.nextUrl.searchParams;
  const isEmailFlow = params.get("flow") === "email";

  // Cancellation, denial or an expired/used email link arrive as `error`.
  // Never echo the provider-supplied text.
  if (params.has("error")) return loginWith(isEmailFlow ? "email_link_invalid" : "oauth_cancelled");

  const code = codeSchema.safeParse(params.get("code"));
  if (!code.success) return loginWith(isEmailFlow ? "email_link_invalid" : "oauth_failed");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code.data);
  if (error) return loginWith(isEmailFlow ? "email_confirmed_sign_in" : "oauth_failed");

  return NextResponse.redirect(new URL("/", request.url));
}
