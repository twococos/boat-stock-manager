import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/common';
import { useAuth } from '@/auth/AuthProvider';
import { useSync } from '@/sync/SyncProvider';
import { getDefaultDiners, setDefaultDiners } from '@/auth/session';
import { downloadBackup, importBackup } from '@/db/backup';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { relativeFromNow } from '@/lib/time';

/** Ajustos: nom, comensals, sync, backup, instal·lació, sessió. */
export function Settings() {
  const { userName, setName, signOut } = useAuth();
  const { lastSyncedAt, pendingCount, syncNow, status } = useSync();
  const navigate = useNavigate();
  const [name, setNameField] = useState(userName ?? '');
  const [diners, setDiners] = useState(getDefaultDiners());
  const { canInstall, promptInstall, isIOS } = useInstallPrompt();
  const [importMsg, setImportMsg] = useState<string | null>(null);

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const added = await importBackup(await file.text());
      setImportMsg(`${added} esdeveniments importats.`);
    } catch {
      setImportMsg('Error en importar el fitxer.');
    }
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-xl font-bold">Ajustos</h1>

      <Card className="flex flex-col gap-2">
        <label className="text-sm font-medium text-boat-700">El teu nom</label>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl border border-boat-100 px-4 py-3"
            value={name}
            onChange={(e) => setNameField(e.target.value)}
          />
          <Button onClick={() => setName(name)} className="w-auto px-4">Desar</Button>
        </div>
      </Card>

      <Card className="flex items-center justify-between">
        <label className="text-sm font-medium text-boat-700">Comensals per defecte</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            className="w-20 rounded-xl border border-boat-100 px-3 py-2"
            value={diners}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10) || 1;
              setDiners(n);
              setDefaultDiners(n);
            }}
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-boat-700">Sincronització</span>
          <span className="text-xs text-boat-500">
            {status === 'not-configured'
              ? 'Mode local'
              : lastSyncedAt
                ? `Última: ${relativeFromNow(lastSyncedAt)}`
                : 'Sense sincronitzar'}
          </span>
        </div>
        {pendingCount > 0 && (
          <span className="text-xs text-amber-700">{pendingCount} canvis pendents</span>
        )}
        <Button variant="secondary" onClick={() => void syncNow()}>
          Sincronitzar ara
        </Button>
      </Card>

      <Card className="flex flex-col gap-2">
        <span className="text-sm font-medium text-boat-700">Còpia de seguretat</span>
        <Button variant="secondary" onClick={() => void downloadBackup()}>
          Exportar (JSON)
        </Button>
        <label className="btn-touch w-full cursor-pointer bg-boat-100 text-boat-900">
          Importar (JSON)
          <input type="file" accept="application/json" className="hidden" onChange={onImport} />
        </label>
        {importMsg && <p className="text-xs text-boat-600">{importMsg}</p>}
      </Card>

      {(canInstall || isIOS) && (
        <Card className="flex flex-col gap-2">
          <span className="text-sm font-medium text-boat-700">Instal·lar l'app</span>
          {canInstall ? (
            <Button onClick={() => void promptInstall()}>Instal·lar en aquest dispositiu</Button>
          ) : (
            <p className="text-xs text-boat-600">
              A iPhone: toca el botó de Compartir de Safari i tria «Afegir a la pantalla
              d'inici».
            </p>
          )}
        </Card>
      )}

      <Card className="flex flex-col gap-2">
        <Button variant="secondary" onClick={() => navigate('/history')}>
          Veure historial
        </Button>
        <Button variant="danger" onClick={() => void signOut()}>
          Tancar sessió
        </Button>
      </Card>
    </div>
  );
}
