// File: frontend/src/lib/supabaseClient.ts
// Purpose: Provides frontend helper logic for supabase client.
// It supports shared data, API, or formatting behavior used across the app.

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn("[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. Supabase features will be disabled.");
}

export const supabase = url && anonKey
  ? createClient(url, anonKey)
  : null;

export type SupabaseClientValue = typeof supabase;

