import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database.types";
import { getConfig } from "@/lib/config/env";

/**
 * Request-scoped Supabase client acting as the signed-in user, so every
 * query is subject to Row Level Security. Only valid in real-user mode.
 */
export async function createClient() {
  const { supabase } = getConfig();
  if (!supabase) {
    throw new Error("Supabase client requested in demo mode.");
  }
  const cookieStore = await cookies();

  return createServerClient<Database>(supabase.url, supabase.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session cookie on the next request.
        }
      },
    },
  });
}
