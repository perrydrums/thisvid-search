import React from 'react';
import ReactDOM from 'react-dom/client';
import { Navigate, Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom';

import { AuthEmailReturnHandler } from './components/AuthEmailReturnHandler';
import { AuthProvider } from './hooks/useAuth';
import { getNameWithSeed } from './helpers/users';
import './index.css';
import Search from './pages/Search';
import Analyse from './pages/Analyse';
import RecommendationsPage from './pages/Recommendations';
import { ShortLinkResolver } from './pages/ShortLinkResolver';
import History from './pages/History';
import Moods from './pages/Moods';
import Settings from './pages/Settings';
import SearchLegacy from './pages/legacy/SearchLegacy';

// Drop caches from the removed What's New feed and the old recommendations page.
localStorage.removeItem('tvass-recommendations');
localStorage.removeItem('tvass-whats-new-videos');

// Generate random visitor ID if not already set in local storage.
if (!localStorage.getItem('visitorId')) {
  localStorage.setItem('visitorId', Math.random().toString(36).substring(2));

  // Get name with seed
  getNameWithSeed(localStorage.getItem('visitorId')).then((name) => {
    localStorage.setItem('visitorName', name);
  });
}

if (!localStorage.getItem('visitorName')) {
  getNameWithSeed(localStorage.getItem('visitorId')).then((name) => {
    localStorage.setItem('visitorName', name);
  });
}

function AppShell() {
  return (
    <AuthProvider>
      <AuthEmailReturnHandler />
      <Outlet />
    </AuthProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        path: '/',
        element: <Search />,
      },
      {
        path: '/search',
        element: <Search />,
      },
      {
        path: '/settings',
        element: <Settings />,
      },
      {
        path: '/moods',
        element: <Moods />,
      },
      {
        path: '/history',
        element: <History />,
      },
      {
        path: '/analyse',
        element: <Analyse />,
      },
      {
        path: '/recommendations',
        element: <RecommendationsPage />,
      },
      {
        path: '/s/:code',
        element: <ShortLinkResolver />,
      },
      {
        path: '/legacy/search',
        element: <SearchLegacy />,
      },
      {
        path: '/legacy/analyse',
        element: <Navigate to="/analyse" replace />,
      },
      {
        path: '/legacy/recommendations',
        element: <Navigate to="/recommendations" replace />,
      },
      {
        path: '/legacy/whats-new',
        element: <Navigate to="/recommendations" replace />,
      },
    ],
  },
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
