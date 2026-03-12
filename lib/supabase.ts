import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Export a mock client if credentials are missing to prevent runtime errors
let client;

try {
  if (supabaseUrl && supabaseKey) {
    client = createClient(supabaseUrl, supabaseKey);
  }
} catch (error) {
  console.error('Error initializing Supabase client:', error);
}

if (!client) {
  console.warn('Using mock Supabase client (missing credentials or initialization failed)');
  client = {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
        eq: () => Promise.resolve({ data: [], error: null }),
        single: () => Promise.resolve({ data: null, error: null })
      }),
      insert: () => ({
        select: () => Promise.resolve({ data: [], error: null })
      }),
      update: () => ({
        eq: () => ({
            select: () => Promise.resolve({ data: [], error: null })
        })
      }),
      delete: () => ({
        eq: () => Promise.resolve({ data: [], error: null })
      }),
    })
  } as any;
}

export const supabase = client;
