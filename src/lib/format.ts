import type { QuantityType } from '@/types/entities';

/** Formata una quantitat amb la seva unitat de forma llegible. */
export function formatQuantity(qty: number, type: QuantityType): string {
  const rounded = Math.round(qty * 100) / 100;
  switch (type) {
    case 'units':
      return `${rounded}`;
    case 'kg':
      return `${rounded} kg`;
    case 'L':
      return `${rounded} L`;
  }
}
