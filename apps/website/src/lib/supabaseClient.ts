// File: src/lib/supabaseClient.ts
// Purpose: Low-level library/client configuration used by higher-level modules.
// If you change this file: Changing connection settings or exported client behavior can break all dependent API/data operations.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL!;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anonKey);

