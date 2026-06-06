// ─────────────────────────────────────────────────────────────────────────────
// Punt central d'icones (lucide-react).
//
// Tots els components importen les icones d'aquí en comptes de fer servir emojis o
// importar lucide directament, perquè el conjunt d'icones de l'app sigui coherent i
// fàcil de canviar en un sol lloc.
// ─────────────────────────────────────────────────────────────────────────────
import {
  Home,
  Archive,
  Package,
  CheckSquare,
  Square,
  Settings,
  Sailboat,
  ChefHat,
  ShoppingCart,
  Wrench,
  BookOpen,
  Droplet,
  Cookie,
  CakeSlice,
  Croissant,
  Search,
  Flame,
  AlertTriangle,
  ThumbsUp,
  Utensils,
  Salad,
  ScrollText,
  Inbox,
  Trash2,
  Pencil,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { StockDeltaReason } from '@/types/events';

export {
  Home,
  Archive,
  Package,
  CheckSquare,
  Square,
  Settings,
  Sailboat,
  ChefHat,
  ShoppingCart,
  Wrench,
  BookOpen,
  Droplet,
  Cookie,
  CakeSlice,
  Croissant,
  Search,
  Flame,
  AlertTriangle,
  ThumbsUp,
  Utensils,
  Salad,
  ScrollText,
  Inbox,
  Trash2,
  Pencil,
  X,
};
export type { LucideIcon };

/** Icona per a la raó d'un moviment d'estoc (historial). */
export function reasonIcon(reason: StockDeltaReason): LucideIcon {
  switch (reason) {
    case 'cooking':
      return ChefHat;
    case 'purchase':
      return ShoppingCart;
    case 'adjustment':
      return Wrench;
  }
}

/** Icona orientativa per a cada opció del menú de cuina. */
export type CookMode = 'recipe' | 'water' | 'snacks' | 'dessert' | 'breakfast' | 'all';

export function cookModeIcon(mode: CookMode): LucideIcon {
  switch (mode) {
    case 'recipe':
      return BookOpen;
    case 'water':
      return Droplet;
    case 'snacks':
      return Cookie;
    case 'dessert':
      return CakeSlice;
    case 'breakfast':
      return Croissant;
    case 'all':
      return Search;
  }
}
