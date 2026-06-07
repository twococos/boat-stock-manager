import { useNavigate } from 'react-router-dom';
import type { ResourceKind } from '@/types/entities';
import { TileButton } from '@/components/ui/common';
import { resourceIcon } from '@/components/ui/icons';
import { t } from '@/text';

const KINDS: ResourceKind[] = ['fuel', 'water', 'gas'];

/** Menú de selecció del recurs a mesurar (gasoil / aigua / gas). */
export function MeasureMenu() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-xl font-bold">{t.measureMenu.title}</h1>
      <div className="grid grid-cols-2 gap-3">
        {KINDS.map((kind) => (
          <TileButton
            key={kind}
            icon={resourceIcon(kind)}
            label={t.resources.kind[kind] ?? ''}
            onClick={() => navigate(`/resources/${kind}`)}
            className="bg-white text-boat-900"
          />
        ))}
      </div>
    </div>
  );
}
