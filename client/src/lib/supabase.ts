import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://wvcfiykaxhggknlxybt.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_f5HFQhZya22OwoI_FIkNBA_NBrvey2o';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
