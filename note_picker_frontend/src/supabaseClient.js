import { createClient } from '@supabase/supabase-js';

// PUBLIC_INTERFACE
// Create and export the Supabase client using credentials from .env.
// Uses: REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
