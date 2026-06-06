import { useState, type FormEvent } from 'react';
import { useAuth } from './AuthProvider';
import { isSupabaseConfigured } from '@/sync/supabase';
import { Button } from '@/components/ui/Button';
import { Sailboat } from '@/components/ui/icons';

/**
 * Pantalla de login: nom lliure + contrasenya del vaixell.
 *
 * El nom registra "qui" fa cada acció; la contrasenya autentica "tripulant". Veure
 * PLA.md (secció 7). Si Supabase no està configurat, només cal el nom (mode local).
 */
export function LoginScreen() {
  const { signIn, error } = useAuth();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(name, password);
    } catch {
      // L'error es mostra via el context (error).
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full bg-boat-50 text-boat-900 flex flex-col items-center justify-center gap-6 p-6">
      <Sailboat size={64} className="text-boat-700" />
      <h1 className="text-2xl font-bold">Boat Stock Manager</h1>

      <form onSubmit={onSubmit} className="w-full max-w-xs flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-boat-700">El teu nom</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="rounded-xl border border-boat-100 px-4 py-3 text-lg"
            placeholder="p.ex. Aimar"
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-boat-700">
            Contrasenya del vaixell
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="rounded-xl border border-boat-100 px-4 py-3 text-lg"
            placeholder={isSupabaseConfigured ? '••••••' : '(no cal en mode local)'}
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={busy}>
          {busy ? 'Entrant…' : 'Entrar'}
        </Button>
      </form>

      {!isSupabaseConfigured && (
        <p className="text-xs text-boat-500 max-w-xs text-center">
          Mode local: encara no s'ha configurat el núvol. Pots treballar offline; la
          sincronització s'activarà quan es configuri Supabase.
        </p>
      )}
    </div>
  );
}
