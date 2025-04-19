import { createClient } from '@supabase/supabase-js';

// Get environment variables with validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  // In development, show a clear error about missing environment variables
  if (process.env.NODE_ENV !== 'production') {
    console.error(
      '❌ Supabase credentials missing. Please check your .env.local file.'
    );
  }
  
  // In production, log a less detailed error
  throw new Error('Missing Supabase credentials');
}

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);