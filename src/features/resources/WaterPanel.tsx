import { useState } from 'react';
import type { ResourceConfig, ResourceState, WaterTank } from '@/types/entities';
import { Button } from '@/components/ui/Button';
import { Card, ProgressBar } from '@/components/ui/common';
import { commitWaterMeasure, commitWaterRefill, commitResourceConfig } from '@/db/commands';
import { useAuth } from '@/auth/AuthProvider';
import { nowISO } from '@/lib/time';
import { t } from '@/text';

const TANKS: WaterTank[] = ['proa', 'popa'];

/** Panell de mesura, ompliment i selecció de tanc de l'aigua. */
export function WaterPanel({
  state,
  config,
}: {
  state: ResourceState | undefined;
  config: ResourceConfig | undefined;
}) {
  const { userName } = useAuth();
  const proaCap = config?.water?.proaLiters ?? 0;
  const popaCap = config?.water?.popaLiters ?? 0;
  const activeTank: WaterTank = state?.activeTank ?? 'proa';

  const [counter, setCounter] = useState<number>(state?.lastCounter ?? 0);
  const [selectedTank, setSelectedTank] = useState<WaterTank>(activeTank);
  const [refillTank, setRefillTank] = useState<WaterTank>('proa');
  const [refillLiters, setRefillLiters] = useState(0);
  const [editCfg, setEditCfg] = useState(false);
  const [proa, setProa] = useState(proaCap);
  const [popa, setPopa] = useState(popaCap);

  const tankChanged = selectedTank !== activeTank;
  const litersOf = (tank: WaterTank) =>
    tank === 'proa' ? state?.waterProaLiters ?? 0 : state?.waterPopaLiters ?? 0;
  const capOf = (tank: WaterTank) => (tank === 'proa' ? proaCap : popaCap);

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold text-boat-700">
            {state?.percent === null || state?.percent === undefined
              ? t.resources.notMeasured
              : `${Math.round(state.percent)}%`}
          </span>
          <span className="text-sm text-boat-500">
            {t.resources.waterTotal}: {Math.round(state?.waterTotalLiters ?? 0)} L
          </span>
        </div>
        <ProgressBar percent={state?.percent ?? null} />
        <div className="mt-1 flex gap-3">
          {TANKS.map((tank) => (
            <div key={tank} className="flex-1 rounded-xl bg-boat-50 p-2 text-center">
              <span className="block text-xs font-semibold text-boat-700">
                {t.resources.tank[tank]}
                {tank === activeTank ? ' ●' : ''}
              </span>
              <span className="block text-sm text-boat-500">
                {t.resources.tankLitersOf(litersOf(tank), capOf(tank))}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Afegir mesura del comptador + tanc actiu */}
      <Card className="flex flex-col gap-3">
        <label className="text-sm font-semibold text-boat-700">{t.resources.counterReading}</label>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={counter || ''}
          onChange={(e) => setCounter(Number(e.target.value))}
          className="rounded-xl border border-boat-100 px-4 py-3"
        />

        <label className="text-sm font-semibold text-boat-700">{t.resources.selectActiveTank}</label>
        <div className="flex gap-2">
          {TANKS.map((tank) => (
            <button
              key={tank}
              onClick={() => setSelectedTank(tank)}
              className={`flex-1 rounded-xl px-3 py-3 text-sm font-semibold active:scale-95 ${
                selectedTank === tank ? 'bg-boat-700 text-white' : 'bg-boat-100 text-boat-900'
              }`}
            >
              {t.resources.tank[tank]}
            </button>
          ))}
        </div>
        {tankChanged && (
          <p className="text-xs text-amber-600">{t.resources.switchTankNeedsCounter}</p>
        )}

        <Button onClick={() => void commitWaterMeasure(userName ?? '', counter, selectedTank)}>
          {t.resources.addMeasure}
        </Button>
      </Card>

      {/* Omplir un tanc */}
      <Card className="flex flex-col gap-3">
        <label className="text-sm font-semibold text-boat-700">{t.resources.fill}</label>
        <div className="flex gap-2">
          {TANKS.map((tank) => (
            <button
              key={tank}
              onClick={() => setRefillTank(tank)}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold active:scale-95 ${
                refillTank === tank ? 'bg-boat-700 text-white' : 'bg-boat-100 text-boat-900'
              }`}
            >
              {t.resources.tank[tank]}
            </button>
          ))}
        </div>
        <Button
          variant="secondary"
          onClick={() => void commitWaterRefill(userName ?? '', refillTank, { toFull: true })}
        >
          {t.resources.fillTank(t.resources.tank[refillTank] ?? '')} · {t.resources.full}
        </Button>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={refillLiters || ''}
            onChange={(e) => setRefillLiters(Number(e.target.value))}
            placeholder={t.resources.liters}
            className="min-w-0 flex-1 rounded-xl border border-boat-100 px-4 py-3"
          />
          <Button
            variant="secondary"
            className="!w-auto shrink-0 px-4"
            disabled={refillLiters <= 0}
            onClick={() => {
              void commitWaterRefill(userName ?? '', refillTank, { addedLiters: refillLiters });
              setRefillLiters(0);
            }}
          >
            {t.resources.fill}
          </Button>
        </div>
      </Card>

      {/* Configuració */}
      {editCfg ? (
        <Card className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-boat-700">{t.resources.proaCapacity}</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={proa || ''}
            onChange={(e) => setProa(Number(e.target.value))}
            className="rounded-xl border border-boat-100 px-4 py-3"
          />
          <label className="text-sm font-semibold text-boat-700">{t.resources.popaCapacity}</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={popa || ''}
            onChange={(e) => setPopa(Number(e.target.value))}
            className="rounded-xl border border-boat-100 px-4 py-3"
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditCfg(false)}>
              {t.resources.cancel}
            </Button>
            <Button
              onClick={() => {
                void commitResourceConfig(userName ?? '', {
                  kind: 'water',
                  water: { proaLiters: proa, popaLiters: popa },
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
