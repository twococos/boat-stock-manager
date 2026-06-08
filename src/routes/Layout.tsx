import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SyncIndicator } from '@/components/ui/SyncIndicator';
import {
  Home,
  Archive,
  Package,
  CheckSquare,
  BookOpen,
  Settings,
  Sailboat,
  type LucideIcon,
} from '@/components/ui/icons';
import { useAuth } from '@/auth/AuthProvider';
import { useSync } from '@/sync/SyncProvider';
import { t } from '@/text';

const tabs: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: t.nav.home, icon: Home, end: true },
  { to: '/locations', label: t.nav.locations, icon: Archive },
  { to: '/objects', label: t.nav.objects, icon: Package },
  { to: '/recipes', label: t.nav.recipes, icon: BookOpen },
  { to: '/checklists', label: t.nav.checklists, icon: CheckSquare },
];

/** Layout principal: capçalera amb sync + contingut + navegació inferior. */
export function Layout() {
  const { userName } = useAuth();
  const { online, pendingCount, status } = useSync();
  const location = useLocation();
  const navigate = useNavigate();
  const showOfflineBanner =
    status !== 'not-configured' && (!online || status === 'offline');
  return (
    <div className="flex min-h-full flex-col bg-boat-50 text-boat-900">
      <header className="flex items-center justify-between px-4 py-2">
        <button
          onClick={() => navigate('/settings')}
          aria-label={t.nav.settingsAria}
          className="flex items-center gap-1.5 text-sm font-semibold active:scale-95"
        >
          <Sailboat size={18} className="text-boat-700" />
          {userName}
          <Settings size={16} className="text-boat-400" />
        </button>
        <SyncIndicator />
      </header>

      {showOfflineBanner && (
        <div className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">
          {t.nav.offlineBanner(pendingCount)}
        </div>
      )}

      <main className="flex flex-1 flex-col overflow-y-auto px-4 pb-24">
        {/* `key` per ruta → cada navegació refà el fade d'entrada. El wrapper creix amb
            flex-1 (no amb height:%) perquè les pàgines puguin ancorar contingut a baix amb
            un fill `flex-1` + `mt-auto` (p.ex. el botó del Mode compra). */}
        <div key={location.pathname} className="flex flex-1 flex-col animate-fade-in">
          <Outlet />
        </div>
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
