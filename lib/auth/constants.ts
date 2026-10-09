// Shared by the proxy (no server-only imports allowed there) and the session layer.
export const DEMO_SESSION_COOKIE = "mhv_demo_session";
export const DEMO_SESSION_TTL_SECONDS = 8 * 60 * 60;

/** Paths that never require a patient session. Everything else in the app does. */
export const AUTH_PAGES = ["/login", "/signup"] as const;

export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));
}
