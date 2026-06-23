import { createClient } from '@supabase/supabase-js';

// Defensively strip any CRLF/LF/whitespace injected by CI or Vercel
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string)
  ?.replace(/\r/g, '').replace(/\n/g, '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string)
  ?.replace(/\r/g, '').replace(/\n/g, '').trim();

// Diagnostics — visible in browser DevTools console
console.log('[Supabase] URL:', JSON.stringify(supabaseUrl));
console.log('[Supabase] Key length:', supabaseAnonKey?.length);
console.log('[Supabase] Key last 10:', JSON.stringify(supabaseAnonKey?.slice(-10)));

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase env vars not set. Running in demo mode.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
);

// ─── Auth helpers ───────────────────────────────────────────────
export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  });

export const signOut = () => supabase.auth.signOut();

export const getSession = () => supabase.auth.getSession();
export const getUser = () => supabase.auth.getUser();
