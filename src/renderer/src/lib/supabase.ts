import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'implicit', // Esto evita el uso de PKCE y los errores de "code_verifier" en Electron
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false // Lo manejamos nosotros manualmente
  }
});
