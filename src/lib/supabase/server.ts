import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Admin client — uses the secret key, bypasses RLS. Never import from client components. */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
