// Shared by the proxy (no server-only imports allowed there) and the session layer.
export const DEMO_SESSION_COOKIE = "mhv_demo_session";
export const DEMO_SESSION_TTL_SECONDS = 8 * 60 * 60;

/** Pages reachable without a patient session. Everything else in the app requires one. */
export const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback"] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
