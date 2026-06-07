import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react/offline';
import { Package, type LucideIcon } from './icons';
import { loadIconSets, iconSetsLoaded, LEGACY_ICON_MAP } from '@/features/objects/iconSets';

/**
 * Render unificat de la icona d'un objecte.
 *
 * El camp `ItemObject.icon` pot ser:
 *  - una clau Iconify (`tabler:apple`, `game-icons:fish-cooked`) → es dibuixa la icona;
 *  - una clau curta del catàleg antic (`apple`, `fish`…) → es migra amb `LEGACY_ICON_MAP`;
 *  - qualsevol altre text (emojis del seed, valors antics) → es mostra tal qual;
 *  - buit/undefined → s'usa la icona de reserva (`fallback`).
 *
 * Els sets Iconify es carreguen en mode OFFLINE i de forma lazy (`loadIconSets`); fins
 * que no estan registrats, `Icon` no dibuixa res, així que forcem la càrrega en muntar.
 */
export function ObjectIcon({
  icon,
  size = 22,
  className = 'text-boat-500',
  fallback: Fallback = Package,
}: {
  icon?: string;
  size?: number;
  className?: string;
  fallback?: LucideIcon;
}) {
  // Resol clau Iconify directa o migració d'una clau curta antiga.
  const iconifyKey = resolveIconifyKey(icon);

  // Assegura que els sets estiguin registrats abans de dibuixar icones Iconify.
  const [ready, setReady] = useState(iconSetsLoaded());
  useEffect(() => {
    if (!iconifyKey || ready) return;
    let alive = true;
    loadIconSets().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [iconifyKey, ready]);

  if (iconifyKey) {
    // Mentre carrega, reserva l'espai amb el fallback perquè no faci salt de layout.
    if (!ready) return <Fallback size={size} className={className} />;
    return <Icon icon={iconifyKey} width={size} height={size} className={className} />;
  }
  if (icon) {
    // Emoji o text lliure: es renderitza directament (retrocompatibilitat).
    return <span style={{ fontSize: size }}>{icon}</span>;
  }
  return <Fallback size={size} className={className} />;
}

/** Retorna la clau Iconify per a un valor de `icon`, o `undefined` si no n'és una. */
function resolveIconifyKey(icon?: string): string | undefined {
  if (!icon) return undefined;
  if (icon.includes(':')) return icon; // ja és una clau Iconify
  return LEGACY_ICON_MAP[icon]; // clau curta antiga → Iconify (o undefined)
}
