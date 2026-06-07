import { createHashRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { LoginScreen } from './auth/LoginScreen';
import { SyncProvider } from './sync/SyncProvider';
import { Layout } from './routes/Layout';
import { Home } from './routes/Home';
import { CookMenu } from './routes/CookMenu';
import { PurchaseFlow } from './routes/PurchaseFlow';
import { ObjectsList } from './routes/ObjectsList';
import { LocationsList } from './routes/LocationsList';
import { LocationView } from './routes/LocationView';
import { Recipes } from './routes/Recipes';
import { Checklists } from './routes/Checklists';
import { History } from './routes/History';
import { Expiring } from './routes/Expiring';
import { Settings } from './routes/Settings';
import { t } from '@/text';

// HashRouter: funciona en hosting estàtic (Cloudflare/GitHub Pages) sense config de
// reescriptura de rutes al servidor.
const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'cook', element: <CookMenu /> },
      { path: 'purchase', element: <PurchaseFlow /> },
      { path: 'objects', element: <ObjectsList /> },
      { path: 'objects/recipes', element: <Recipes /> },
      { path: 'recipes', element: <Recipes /> },
      { path: 'locations', element: <LocationsList /> },
      { path: 'locations/:id', element: <LocationView /> },
      { path: 'checklists', element: <Checklists /> },
      { path: 'history', element: <History /> },
      { path: 'expiring', element: <Expiring /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
]);

function Gate() {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-boat-50 text-boat-700">
        {t.common.loading}
      </div>
    );
  }
  return authenticated ? <RouterProvider router={router} /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <SyncProvider>
        <Gate />
      </SyncProvider>
    </AuthProvider>
  );
}
