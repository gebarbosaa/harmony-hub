import { createClient } from '@supabase/supabase-js';

const env = import.meta.env as Record<string, string | undefined>;

// The Supabase URL and publishable key are public client configuration.
// Keep environment variables as the preferred source, but retain a safe
// production fallback so SSR cannot crash when Vercel omits VITE_* variables.
const supabaseUrl =
  env.VITE_SUPABASE_URL ||
  (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined) ||
  'https://cyopbtfcnyetoolgwqyt.supabase.co';

const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined) ||
  'sb_publishable_yV_AG9hVbJaV23XQv6IOrA_swCnY71H';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Configuração do Supabase ausente: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
