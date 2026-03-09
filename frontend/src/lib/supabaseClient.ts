// File: frontend/src/lib/supabaseClient.ts
// What this code does:
// 1) Provides shared frontend helpers and API client utilities.
// 2) Centralizes fetch, parsing, and cross-page helper logic.
// 3) Reduces duplicated behavior across pages/components.
// 4) Exports reusable functions consumed by app modules.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL!;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anonKey);

