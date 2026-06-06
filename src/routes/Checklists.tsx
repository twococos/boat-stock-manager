import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { ChecklistTemplate } from '@/types/entities';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/common';
import { CheckSquare, Square, Pencil } from '@/components/ui/icons';
import { ConfirmDelete } from '@/components/ui/ConfirmDelete';
import { useChecklists } from '@/hooks/useData';
import { db } from '@/db/db';
import { commitChecklistUpsert, commitChecklistDelete } from '@/db/commands';
import { toggleItem, resetProgress } from '@/db/repositories/checklistProgress.repo';
import { useAuth } from '@/auth/AuthProvider';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/time';

/**
 * Checklists: les PLANTILLES se sincronitzen; el PROGRÉS és LOCAL i mai se sincronitza.
 * PLA.md secció 12.6.
 */
export function Checklists() {
  const checklists = useChecklists() ?? [];
  const [open, setOpen] = useState<ChecklistTemplate | null>(null);
  const [editing, setEditing] = useState<ChecklistTemplate | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-3 pt-2">
      <h1 className="text-xl font-bold">Checklists</h1>

      {checklists.length === 0 ? (
        <EmptyState icon={CheckSquare} text="Cap checklist. Crea procediments rutinaris." />
      ) : (
        <ul className="flex flex-col gap-2">
          {checklists.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm"
            >
              <button
                onClick={() => setOpen(c)}
                className="flex flex-1 items-center justify-between active:scale-[0.98]"
              >
                <span className="font-semibold">{c.title}</span>
                <span className="text-xs text-boat-500">{c.items.length} passos</span>
              </button>
              <button
                onClick={() => setEditing(c)}
                aria-label="Editar plantilla"
                className="ml-3 text-boat-600"
              >
                <Pencil size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button onClick={() => setCreating(true)}>+ Nova checklist</Button>

      {open && <RunSheet template={open} onClose={() => setOpen(null)} />}
      <Sheet open={creating} onClose={() => setCreating(false)} title="Nova checklist">
        <ChecklistEditor onDone={() => setCreating(false)} />
      </Sheet>
      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Editar checklist"
      >
        {editing && (
          <ChecklistEditor initial={editing} onDone={() => setEditing(null)} />
        )}
      </Sheet>
    </div>
  );
}

/** Full d'execució: tatxar items (progrés local). */
function RunSheet({
  template,
  onClose,
}: {
  template: ChecklistTemplate;
  onClose: () => void;
}) {
  const progress = useLiveQuery(
    () => db.checklistProgress.get(template.id),
    [template.id],
  );
  const checked = new Set(progress?.checkedItemIds ?? []);

  return (
    <Sheet open onClose={onClose} title={template.title}>
      <ul className="flex flex-col gap-1">
        {template.items.map((it) => {
          const done = checked.has(it.id);
          return (
            <li key={it.id}>
              <button
                onClick={() => void toggleItem(template.id, it.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${
                  done ? 'bg-green-50 text-boat-400 line-through' : 'bg-boat-50'
                }`}
              >
                {done ? (
                  <CheckSquare size={22} className="shrink-0 text-green-600" />
                ) : (
                  <Square size={22} className="shrink-0 text-boat-400" />
                )}
                <span>{it.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3">
        <Button variant="secondary" onClick={() => void resetProgress(template.id)}>
          Reiniciar progrés
        </Button>
      </div>
    </Sheet>
  );
}

/** Editor de la plantilla (sincronitzable). */
function ChecklistEditor({
  initial,
  onDone,
}: {
  initial?: ChecklistTemplate;
  onDone: () => void;
}) {
  const { userName } = useAuth();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [itemsText, setItemsText] = useState(
    (initial?.items ?? []).map((i) => i.label).join('\n'),
  );

  async function save() {
    if (!title.trim() || !userName) return;
    const now = nowISO();
    const template: ChecklistTemplate = {
      id: initial?.id ?? newId(),
      title: title.trim(),
      items: itemsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((label) => ({ id: newId(), label })),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    await commitChecklistUpsert(userName, template);
    onDone();
  }

  async function remove() {
    if (!initial || !userName) return;
    await commitChecklistDelete(userName, initial.id);
    onDone();
  }

  const field = 'rounded-xl border border-boat-100 px-4 py-3 w-full';
  return (
    <div className="flex flex-col gap-3">
      <input className={field} placeholder="Títol (p.ex. Sortir de cala)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <label className="text-sm font-medium text-boat-700">Passos (un per línia)</label>
      <textarea
        className={field}
        rows={8}
        value={itemsText}
        onChange={(e) => setItemsText(e.target.value)}
        placeholder={'Aixecar àncora\nRecollir defenses\nEngegar motor'}
      />
      <Button onClick={() => void save()}>Desar plantilla</Button>
      {initial && (
        <ConfirmDelete
          message={`Eliminar la checklist "${initial.title}"?`}
          onConfirm={remove}
        />
      )}
    </div>
  );
}
