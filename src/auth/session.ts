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
const EDIT_LOCKED_KEY = 'boat-stock-manager.editLocked';
const DURATION_WINDOW_KEY = 'boat-stock-manager.durationWindowDays';

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

/**
 * Mode "bloquejar edició": quan és actiu, s'amaguen els botons d'afegir/editar/
 * eliminar definicions (objectes, llocs, receptes, checklists) per evitar canvis
 * accidentals. Comprar, cuinar, ajustar estoc i el progrés de checklists segueixen
 * disponibles. Per defecte ESTÀ ACTIU (true) si no s'ha desat mai.
 */
export function getEditLocked(): boolean {
  const v = localStorage.getItem(EDIT_LOCKED_KEY);
  return v === null ? true : v === '1';
}

export function setEditLocked(locked: boolean): void {
  localStorage.setItem(EDIT_LOCKED_KEY, locked ? '1' : '0');
  // Notifica els components reactius (mateixa pestanya; `storage` cobreix les altres).
  window.dispatchEvent(new CustomEvent('editlock-change'));
}

/**
 * Finestra (en dies) per estimar el ritme de consum al dashboard. Es pot ajustar a
 * Ajustos; per defecte 3 dies. S'aplica tant a l'aigua agregada com a la resta
 * d'objectes amb estimació de durada.
 */
export function getDurationWindowDays(): number {
  const v = localStorage.getItem(DURATION_WINDOW_KEY);
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 3;
}

export function setDurationWindowDays(days: number): void {
  localStorage.setItem(DURATION_WINDOW_KEY, String(Math.max(1, Math.round(days))));
  window.dispatchEvent(new CustomEvent('duration-window-change'));
}
