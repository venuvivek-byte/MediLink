import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { parseConfig, type AppConfig } from "@/lib/config/schema";
import { DEMO_SESSION_COOKIE, isPublicPath } from "@/lib/auth/constants";

/**
 * Optimistic routing only. The authoritative session check happens in the
 * Data Access Layer (lib/auth/session.ts) on every page and route handler.
 *
 * Responsibilities:
 * - Real-user mode: refresh the Supabase session cookie.
 * - Send visitors without a session (Supabase user or demo/sample cookie) to /login.
 *
 * It deliberately does NOT redirect signed-in users away from /login (the
 * login page does that after verifying the session), so a stale or forged
 * cookie cannot cause a redirect loop.
 */
export async function proxy(request: NextRequest) {
  let config: AppConfig;
  try {
    config = parseConfig(process.env);
  } catch {
    // Let the request through; the page renders the configuration error.
    return NextResponse.next({ request });
  }

  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });
  let hasSession = false;

  // A demo cookie (fictional patient, or the read-only sample in either mode)
  // is verified by the session layer; here its presence is enough. Real-user
  // mode still refreshes the Supabase cookie below whatever this says.
  const hasDemoCookie = request.cookies.has(DEMO_SESSION_COOKIE);

  if (config.mode === "demo") {
    hasSession = hasDemoCookie;
  } else if (config.supabase) {
    const supabase = createServerClient(config.supabase.url, config.supabase.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });
    try {
      const { data } = await supabase.auth.getUser();
      hasSession = Boolean(data.user) || hasDemoCookie;
    } catch {
      hasSession = hasDemoCookie;
    }
  }

  if (!hasSession && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Runs on patient-facing pages only. Excluded:
  // - /api/*: route handlers authorise themselves and must return 401 JSON, not redirects.
  // - /share/<token>, /emergency/<token>: public pages with their own token checks.
  //   (/share and /emergency without a token are the patient's private pages and ARE matched.)
  // - Next.js internals and static assets.
  matcher: [
    "/((?!api/|share/|emergency/|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
