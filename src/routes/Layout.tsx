import { NavLink, Outlet } from 'react-router-dom';
import { SyncIndicator } from '@/components/ui/SyncIndicator';
import { useAuth } from '@/auth/AuthProvider';
import { useSync } from '@/sync/SyncProvider';

const tabs = [
  { to: '/', label: 'Inici', icon: '🏠', end: true },
  { to: '/locations', label: 'Llocs', icon: '🗄️' },
  { to: '/objects', label: 'Objectes', icon: '📦' },
  { to: '/checklists', label: 'Checklists', icon: '✅' },
  { to: '/settings', label: 'Ajustos', icon: '⚙️' },
];

/** Layout principal: capçalera amb sync + contingut + navegació inferior. */
export function Layout() {
  const { userName } = useAuth();
  const { online, pendingCount, status } = useSync();
  const showOfflineBanner =
    status !== 'not-configured' && (!online || status === 'offline');
  return (
    <div className="flex min-h-full flex-col bg-boat-50 text-boat-900">
      <header className="flex items-center justify-between px-4 py-2">
        <span className="text-sm font-semibold">⛵ {userName}</span>
        <SyncIndicator />
      </header>

      {showOfflineBanner && (
        <div className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">
          Sense connexió · {pendingCount} canvi{pendingCount === 1 ? '' : 's'} pendent
          {pendingCount === 1 ? '' : 's'} de sincronitzar
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-4 pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-boat-100 bg-white pb-[env(safe-area-inset-bottom)]">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                isActive ? 'text-boat-700 font-semibold' : 'text-boat-500'
              }`
            }
          >
            <span className="text-xl">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
