import { useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import type { FaultSeverity } from '@/types/events';
import { SEVERITIES, SEVERITY_DOT } from '@/domain/faults/deriveFaults';
import { t } from '@/text';

/** Full per reportar (crear) una avaria: títol, descripció i gravetat. */
export function ReportFaultSheet({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; severity: FaultSeverity }) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<FaultSeverity>('yellow');

  function reset() {
    setTitle('');
    setDescription('');
    setSeverity('yellow');
  }

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit({ title: trimmed, description: description.trim(), severity });
    reset();
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={t.faults.report}
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-boat-700">{t.faults.titleLabel}</span>
          <input
            className="rounded-xl border border-boat-100 px-4 py-3"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.faults.titlePlaceholder}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-boat-700">{t.faults.descriptionLabel}</span>
          <textarea
            className="min-h-[5rem] rounded-xl border border-boat-100 px-4 py-3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.faults.descriptionPlaceholder}
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-boat-700">{t.faults.severityQuestion}</span>
          <div className="grid grid-cols-3 gap-2">
            {SEVERITIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  severity === s
                    ? `${SEVERITY_DOT[s]} ring-2 ring-boat-900 ring-offset-1`
                    : 'bg-boat-50 text-boat-600'
                }`}
              >
                {t.faults.severity[s]}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={submit} disabled={!title.trim()}>
          {t.faults.report}
        </Button>
      </div>
    </Sheet>
  );
}
