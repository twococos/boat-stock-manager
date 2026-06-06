import { NavLink, Outlet } from 'react-router-dom';
import { SyncIndicator } from '@/components/ui/SyncIndicator';
import {
  Home,
  Archive,
  Package,
  CheckSquare,
  Settings,
  Sailboat,
  type LucideIcon,
} from '@/components/ui/icons';
import { useAuth } from '@/auth/AuthProvider';
import { useSync } from '@/sync/SyncProvider';

const tabs: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Inici', icon: Home, end: true },
  { to: '/locations', label: 'Llocs', icon: Archive },
  { to: '/objects', label: 'Objectes', icon: Package },
  { to: '/checklists', label: 'Checklists', icon: CheckSquare },
  { to: '/settings', label: 'Ajustos', icon: Settings },
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
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <Sailboat size={18} className="text-boat-700" />
          {userName}
        </span>
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
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
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
              <Icon size={22} />
              {t.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
