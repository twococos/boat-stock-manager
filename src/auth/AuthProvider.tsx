import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase, isSupabaseConfigured, CREW_EMAIL } from '@/sync/supabase';
import {
  getUserName,
  setUserName as persistName,
  clearUserName,
} from './session';
import { t } from '@/text';

interface AuthState {
  /** Nom visible del tripulant actual (null si encara no s'ha posat). */
  userName: string | null;
  /** True si hi ha sessió Supabase vàlida (o si Supabase no està configurat → local). */
  authenticated: boolean;
  /** True mentre es resol l'estat inicial d'autenticació. */
  loading: boolean;
  /** Error de l'últim intent de login (missatge llegible), o null. */
  error: string | null;
  /** Inicia sessió amb nom + contrasenya del vaixell. */
  signIn: (name: string, boatPassword: string) => Promise<void>;
  /** Tanca la sessió (manté les dades locals). */
  signOut: () => Promise<void>;
  /** Canvia el nom visible sense tornar a autenticar. */
  setName: (name: string) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userName, setUserNameState] = useState<string | null>(getUserName());
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resol l'estat inicial: si hi ha sessió Supabase persistida, és autenticat.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        // Mode local: n'hi ha prou amb tenir un nom.
        if (active) {
          setAuthenticated(Boolean(getUserName()));
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (active) {
        setAuthenticated(Boolean(data.session) && Boolean(getUserName()));
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (name: string, boatPassword: string) => {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t.login.emptyName);
      throw new Error('empty-name');
    }

    if (isSupabaseConfigured && supabase) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: CREW_EMAIL,
        password: boatPassword,
      });
      if (signInError) {
        setError(t.login.wrongPassword);
        throw signInError;
      }
    }
    // Mode local (sense Supabase): s'accepta qualsevol contrasenya; només cal el nom.

    persistName(trimmed);
    setUserNameState(trimmed);
    setAuthenticated(true);
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    clearUserName();
    setUserNameState(null);
    setAuthenticated(false);
  }, []);

  const setName = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    persistName(trimmed);
    setUserNameState(trimmed);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ userName, authenticated, loading, error, signIn, signOut, setName }),
    [userName, authenticated, loading, error, signIn, signOut, setName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth s\'ha d\'usar dins d\'un AuthProvider');
  return ctx;
}
