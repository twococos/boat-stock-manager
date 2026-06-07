/**
 * Foto de capçalera de la pàgina de Llocs, sincronitzada entre la tripulació.
 *
 * En lloc de desar la ruta en local (que no viatja), la guardem dins un
 * `StowageLocation` reservat amb un ID fix. Així reaprofitem tota la
 * infraestructura de sincronització (esdeveniment `location_upsert` + cua de
 * fotos) sense afegir cap tipus d'esdeveniment nou. Aquest "lloc" no és un
 * compartiment real: el hook `useLocations` el filtra perquè cap consumidor
 * (llistes, selectors, vista de compartiment) el tracti com un de real.
 *
 * IMPORTANT: ha de ser un UUID vàlid. El trigger de mirall de Supabase fa
 * `(payload->>'id')::uuid` en aplicar un `location_upsert`; un id no-UUID llançaria
 * un error de cast i bloquejaria tot el sync. Fem servir un UUID v4 fix i reservat
 * (tot zeros amb la versió/variant correctes i un sufix reconeixible).
 */
export const HEADER_LOCATION_ID = '00000000-0000-4000-8000-000000000001';
