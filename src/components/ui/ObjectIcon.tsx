import { findFoodIcon } from '@/features/objects/foodIcons';
import { Package, type LucideIcon } from './icons';

/**
 * Render unificat de la icona d'un objecte.
 *
 * El camp `ItemObject.icon` pot ser:
 *  - una clau d'icona lucide del catàleg de menjar (p.ex. `"apple"`) → es dibuixa la icona;
 *  - qualsevol altre text (emojis del seed o valors antics) → es mostra tal qual;
 *  - buit/undefined → s'usa la icona de reserva (`fallback`).
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
  const entry = findFoodIcon(icon);
  if (entry) {
    const Icon = entry.Icon;
    return <Icon size={size} className={className} />;
  }
  if (icon) {
    // Emoji o text lliure: es renderitza directament (retrocompatibilitat).
    return <span style={{ fontSize: size }}>{icon}</span>;
  }
  return <Fallback size={size} className={className} />;
}
