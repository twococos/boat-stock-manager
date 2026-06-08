import { useState } from 'react';
import type { ResourceConfig, ResourceState } from '@/types/entities';
import { Button } from '@/components/ui/Button';
import { Card, ProgressBar, ToggleButton } from '@/components/ui/common';
import { ConfirmAction } from '@/components/ui/ConfirmAction';
import { commitGasMeasure, commitGasSwap, commitResourceConfig } from '@/db/commands';
import { useAuth } from '@/auth/AuthProvider';
import { nowISO } from '@/lib/time';
import { t } from '@/text';

/** Panell de mesura (pes), canvi de bombona i configuració del gas. */
export function GasPanel({
  state,
  config,
}: {
  state: ResourceState | undefined;
  config: ResourceConfig | undefined;
}) {
  const { userName } = useAuth();
  const fullKg = config?.gas?.fullKg ?? 6.55;
  const emptyKg = config?.gas?.emptyKg ?? 3.8;

  const [weight, setWeight] = useState<number>(state?.gasWeightKg ?? fullKg);
  const [editCfg, setEditCfg] = useState(false);
  const [full, setFull] = useState(fullKg);
  const [empty, setEmpty] = useState(emptyKg);
  // Quina targeta d'acció està desplegada (null = cap).
  const [open, setOpen] = useState<null | 'measure' | 'swap'>(null);

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold text-boat-700">
            {state?.percent === null || state?.percent === undefined
              ? t.resources.notMeasured
              : `${Math.round(state.percent)}%`}
          </span>
          {state?.gasWeightKg !== undefined && (
            <span className="text-sm text-boat-500">{t.resources.gasWeightOf(state.gasWeightKg)}</span>
          )}
        </div>
        <ProgressBar percent={state?.percent ?? null} />
      </Card>

      {/* Toggles d'acció */}
      <div className="flex gap-2">
        <ToggleButton
          label={t.resources.toggleMeasure}
          active={open === 'measure'}
          onClick={() => setOpen(open === 'measure' ? null : 'measure')}
        />
        <ToggleButton
          label={t.resources.swapBottle}
          active={open === 'swap'}
          onClick={() => setOpen(open === 'swap' ? null : 'swap')}
        />
      </div>

      {/* Afegir mesura (pes) */}
      {open === 'measure' && (
        <Card className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-boat-700">{t.resources.gasWeight}</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.05}
            value={weight || ''}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="rounded-xl border border-boat-100 px-4 py-3"
          />
          <Button onClick={() => void commitGasMeasure(userName ?? '', weight)}>
            {t.resources.addMeasure}
          </Button>
        </Card>
      )}

      {/* Canviar bombona (confirma i canvia directament) */}
      {open === 'swap' && (
        <ConfirmAction
          label={t.resources.swapBottle}
          message={t.resources.swapBottleConfirm}
          confirmLabel={t.resources.swapBottle}
          variant="secondary"
          onConfirm={async () => {
            await commitGasSwap(userName ?? '');
            setOpen(null);
          }}
        />
      )}

      {/* Configuració */}
      {editCfg ? (
        <Card className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-boat-700">{t.resources.gasFullKg}</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.05}
            value={full || ''}
            onChange={(e) => setFull(Number(e.target.value))}
            className="rounded-xl border border-boat-100 px-4 py-3"
          />
          <label className="text-sm font-semibold text-boat-700">{t.resources.gasEmptyKg}</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.05}
            value={empty || ''}
            onChange={(e) => setEmpty(Number(e.target.value))}
            className="rounded-xl border border-boat-100 px-4 py-3"
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditCfg(false)}>
              {t.resources.cancel}
            </Button>
            <Button
              onClick={() => {
                void commitResourceConfig(userName ?? '', {
                  kind: 'gas',
                  gas: { fullKg: full, emptyKg: empty, netKg: full - empty },
                  updatedAt: nowISO(),
                });
                setEditCfg(false);
              }}
            >
              {t.resources.save}
            </Button>
          </div>
        </Card>
      ) : (
        <button onClick={() => setEditCfg(true)} className="self-center text-sm text-boat-600">
          {t.resources.settings}
        </button>
      )}
    </div>
  );
}
