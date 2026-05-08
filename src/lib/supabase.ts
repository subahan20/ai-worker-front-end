import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// Backwards-compatible default export — still works as supabase.from(...) etc.
// Uses a Proxy so the instance is only created on first property access.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (prop === '$$typeof' || prop === 'then' || prop === 'toJSON') {
      return undefined;
    }
    return (getSupabase() as any)[prop];
  },
});

