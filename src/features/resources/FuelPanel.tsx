import { useState } from 'react';
import type { ResourceConfig, ResourceState } from '@/types/entities';
import { Button } from '@/components/ui/Button';
import { Card, ProgressBar } from '@/components/ui/common';
import { commitFuelMeasure, commitResourceConfig } from '@/db/commands';
import { useAuth } from '@/auth/AuthProvider';
import { nowISO } from '@/lib/time';
import { t } from '@/text';

/** Panell de mesura i ompliment del gasoil. */
export function FuelPanel({
  state,
  config,
}: {
  state: ResourceState | undefined;
  config: ResourceConfig | undefined;
}) {
  const { userName } = useAuth();
  const capacity = config?.fuel?.capacityLiters ?? 0;
  const [percent, setPercent] = useState(50);
  const [addLiters, setAddLiters] = useState(0);
  const [editCfg, setEditCfg] = useState(false);
  const [cap, setCap] = useState(capacity);

  const liters = state?.fuelLiters;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold text-boat-700">
            {state?.percent === null || state?.percent === undefined
              ? t.resources.notMeasured
              : `${Math.round(state.percent)}%`}
          </span>
          {liters !== undefined && capacity > 0 && (
            <span className="text-sm text-boat-500">{t.resources.fuelLitersOf(liters, capacity)}</span>
          )}
        </div>
        <ProgressBar percent={state?.percent ?? null} />
      </Card>

      {/* Afegir mesura (%) */}
      <Card className="flex flex-col gap-3">
        <label className="text-sm font-semibold text-boat-700">{t.resources.fuelLevel}</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value))}
            className="flex-1 accent-boat-700"
          />
          <span className="w-14 text-right text-lg font-semibold tabular-nums">{percent}%</span>
        </div>
        <Button onClick={() => void commitFuelMeasure(userName ?? '', { percent })}>
          {t.resources.addMeasure}
        </Button>
      </Card>

      {/* Omplir */}
      <Card className="flex flex-col gap-3">
        <label className="text-sm font-semibold text-boat-700">{t.resources.fill}</label>
        <Button variant="secondary" onClick={() => void commitFuelMeasure(userName ?? '', { refillToFull: true })}>
          {t.resources.full}
        </Button>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={addLiters || ''}
            onChange={(e) => setAddLiters(Number(e.target.value))}
            placeholder={t.resources.liters}
            className="min-w-0 flex-1 rounded-xl border border-boat-100 px-4 py-3"
          />
          <Button
            variant="secondary"
            className="!w-auto shrink-0 px-4"
            disabled={addLiters <= 0}
            onClick={() => {
              void commitFuelMeasure(userName ?? '', { addedLiters: addLiters });
              setAddLiters(0);
            }}
          >
            {t.resources.fill}
          </Button>
        </div>
      </Card>

      {/* Configuració */}
      {editCfg ? (
        <Card className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-boat-700">{t.resources.fuelCapacity}</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={cap || ''}
            onChange={(e) => setCap(Number(e.target.value))}
            className="rounded-xl border border-boat-100 px-4 py-3"
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditCfg(false)}>
              {t.resources.cancel}
            </Button>
            <Button
              onClick={() => {
                void commitResourceConfig(userName ?? '', {
                  kind: 'fuel',
                  fuel: { capacityLiters: cap },
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
