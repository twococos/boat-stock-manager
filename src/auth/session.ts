/**
 * Sessió local lleugera.
 *
 * El model d'accés és: contrasenya compartida del vaixell (autentica "tripulant" via
 * Supabase) + nom lliure (registra "qui" fa cada acció). El nom visible és només del
 * client i es desa aquí; s'estampa a `userName` de cada esdeveniment. Es pot canviar
 * sense tornar a autenticar (convidats rotatius al mateix mòbil). Veure PLA.md
 * (seccions 7 i 12).
 */
const NAME_KEY = 'boat-stock-manager.userName';
const DINERS_KEY = 'boat-stock-manager.defaultDiners';

export function getUserName(): string | null {
  return localStorage.getItem(NAME_KEY);
}

export function setUserName(name: string): void {
  localStorage.setItem(NAME_KEY, name.trim());
}

export function clearUserName(): void {
  localStorage.removeItem(NAME_KEY);
}

/** Comensals per defecte (gent a bord ara) per preomplir "cuinar per N". */
export function getDefaultDiners(): number {
  const v = localStorage.getItem(DINERS_KEY);
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 2;
}

export function setDefaultDiners(n: number): void {
  localStorage.setItem(DINERS_KEY, String(Math.max(1, Math.round(n))));
}
