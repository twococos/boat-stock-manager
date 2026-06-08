import { useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { t } from '@/text';

/** Full per afegir una actualització a una avaria. El botó de desar només s'activa amb text. */
export function AddUpdateSheet({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState('');

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        setText('');
        onClose();
      }}
      title={t.faults.addUpdate}
    >
      <div className="flex flex-col gap-4">
        <textarea
          className="min-h-[6rem] rounded-xl border border-boat-100 px-4 py-3"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.faults.updatePlaceholder}
          autoFocus
        />
        <Button onClick={submit} disabled={!text.trim()}>
          {t.faults.saveUpdate}
        </Button>
      </div>
    </Sheet>
  );
}
