import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase singleton.
 *
 * Les credencials venen de variables d'entorn Vite (.env.local). Si no estan
 * configurades, `supabase` és null i l'app funciona en mode 100% local (offline): es
 * pot crear i consultar tot a Dexie, però no hi ha sincronització fins que es
 * configuri el backend. Veure PLA.md (seccions 2 i 6).
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/** Email fix de l'usuari compartit de la tripulació (la contrasenya és la del vaixell). */
export const CREW_EMAIL =
  (import.meta.env.VITE_CREW_EMAIL as string | undefined) ??
  'crew@boat-stock-manager.local';
