import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { getConfig } from "@/lib/config/env";

/**
 * Service-role client. BYPASSES Row Level Security.
 *
 * Use only inside dedicated server-side services that perform their own
 * authorization first (e.g. resolving a hashed share token). Never pass the
 * client or its results to the browser without scoping them.
 */
export function createAdminClient() {
  const { supabase } = getConfig();
  if (!supabase?.serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }
  return createClient<Database>(supabase.url, supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
