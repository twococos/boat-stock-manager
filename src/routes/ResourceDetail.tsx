import { useNavigate, useParams } from 'react-router-dom';
import type { ResourceKind } from '@/types/entities';
import { resourceIcon } from '@/components/ui/icons';
import { useResourceState, useResourceConfig } from '@/hooks/useData';
import { FuelPanel } from '@/features/resources/FuelPanel';
import { WaterPanel } from '@/features/resources/WaterPanel';
import { GasPanel } from '@/features/resources/GasPanel';
import { ResourceHistory } from '@/features/resources/ResourceHistory';
import { t } from '@/text';

const VALID: ResourceKind[] = ['fuel', 'water', 'gas'];

/** Pantalla de detall i mesura d'un recurs continu (gasoil / aigua / gas). */
export function ResourceDetail() {
  const navigate = useNavigate();
  const { kind } = useParams<{ kind: string }>();
  const valid = VALID.includes(kind as ResourceKind) ? (kind as ResourceKind) : null;

  const state = useResourceState(valid ?? 'fuel');
  const config = useResourceConfig(valid ?? 'fuel');

  if (!valid) {
    navigate('/');
    return null;
  }

  const Icon = resourceIcon(valid);

  return (
    <div className="flex flex-col gap-4 pt-2">
      <button onClick={() => navigate(-1)} className="self-start text-sm text-boat-600">
        {t.measureMenu.back}
      </button>
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <Icon size={24} className="text-boat-700" />
        {t.resources.kind[valid]}
      </h1>

      {valid === 'fuel' && <FuelPanel state={state} config={config} />}
      {valid === 'water' && <WaterPanel state={state} config={config} />}
      {valid === 'gas' && <GasPanel state={state} config={config} />}

      <ResourceHistory kind={valid} />
    </div>
  );
}
