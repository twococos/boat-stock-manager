import { useEffect, useState } from 'react';
import { getEditLocked } from '@/auth/session';

/**
 * Mode "bloquejar edició" reactiu.
 *
 * Llegeix el flag de localStorage i es manté sincronitzat: escolta l'event
 * `editlock-change` (canvis a la mateixa pestanya, emès per `setEditLocked`) i
 * l'event `storage` (canvis fets en altres pestanyes). Retorna `true` quan l'edició
 * de definicions ha d'estar bloquejada (valor per defecte).
 */
export function useEditLocked(): boolean {
  const [locked, setLocked] = useState(getEditLocked());

  useEffect(() => {
    const update = () => setLocked(getEditLocked());
    window.addEventListener('editlock-change', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('editlock-change', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return locked;
}
