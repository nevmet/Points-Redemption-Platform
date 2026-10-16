import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl as string, supabaseAnonKey as string)
  : null;

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local.");
    this.name = "SupabaseNotConfiguredError";
  }
}

export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new SupabaseNotConfiguredError();
  }

  return supabase;
}
