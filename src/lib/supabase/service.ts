import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  getSupabasePublicEnv,
  getSupabaseServiceRoleKey,
} from "./env";

// Server-only. Bypasses RLS and must never be imported into client
// components or used to serve browser requests.
export function createServiceClient() {
  const { url } = getSupabasePublicEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isServiceConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}