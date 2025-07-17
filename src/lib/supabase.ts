import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`
    Missing Supabase environment variables!
    Please check your .env file and make sure:
    VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
  `);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce', // Important for secure authentication flow
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    }
  }
});

// Utility function for typed error handling
export function handleSupabaseError<T>(result: T | null, error: any) {
  if (error) {
    console.error('Supabase error:', error);
    throw error;
  }
  return result;
}

// Helper type for paginated responses
export interface PaginatedResult<T> {
  data: T[];
  count: number | null;
}