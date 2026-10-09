import { vi } from "vitest";

/** In-memory stand-in for next/headers `cookies()`. */
export const cookieJar = new Map<string, string>();

export const cookiesMock = async () => ({
  get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
  getAll: () => [...cookieJar.entries()].map(([name, value]) => ({ name, value })),
  has: (name: string) => cookieJar.has(name),
  set: (name: string, value: string) => void cookieJar.set(name, value),
  delete: (name: string) => void cookieJar.delete(name),
});

export class RedirectSignal extends Error {
  constructor(public readonly url: string) {
    super(`redirect:${url}`);
  }
}

export const redirectMock = (url: string): never => {
  throw new RedirectSignal(url);
};

/** Fake Supabase auth: tests set `supabaseUser` to simulate a signed-in user. */
export const supabaseState: { user: { id: string; email: string } | null } = { user: null };
export const supabaseSignOut = vi.fn(async () => ({ error: null }));

export const createSupabaseClientMock = async () => ({
  auth: {
    getUser: async () => ({ data: { user: supabaseState.user }, error: null }),
    signOut: supabaseSignOut,
  },
});
