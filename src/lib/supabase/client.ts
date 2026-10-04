import { createClient } from "@supabase/supabase-js";

/** Browser-safe client — uses the publishable key, subject to RLS. */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);
