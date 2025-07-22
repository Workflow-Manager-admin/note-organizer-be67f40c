import { createClient } from '@supabase/supabase-js';

/**
 * PUBLIC_INTERFACE
 * Create and export the Supabase client using credentials from .env.
 * Uses: REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.
 *
 * To configure, ensure your .env file contains:
 *    REACT_APP_SUPABASE_URL=<your-supabase-project-url>
 *    REACT_APP_SUPABASE_KEY=<your-supabase-anon-or-service-role-key>
 *
 * Both variables are required for Supabase to function.
 *
 * Note:
 * - Running direct SQL queries from the frontend (using raw SQL) is NOT supported via the JS client;
 *   only RESTful CRUD operations on tables/views are available.
 *   For direct SQL execution, use Supabase Edge Functions, PostgREST RPCs, or a backend API proxy.
 */

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_KEY;

if (!supabaseUrl) {
  throw new Error("Supabase Error: REACT_APP_SUPABASE_URL is required (check your .env file).");
}
if (!supabaseAnonKey) {
  throw new Error("Supabase Error: REACT_APP_SUPABASE_KEY is required (check your .env file).");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
