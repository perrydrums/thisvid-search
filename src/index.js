import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';

import { getNameWithSeed } from './helpers/users';
import './index.css';
import Analyse from './pages/Analyse';
import History from './pages/History';
import Home from './pages/Home';
import Moods from './pages/Moods';
import Preferences from './pages/Preferences';
import Recommendations from './pages/Recommendations';
import Search from './pages/Search';
import SearchV2 from './pages/SearchV2';
import Settings from './pages/Settings';
import WhatsNew from './pages/WhatsNew';

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

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/search',
    element: <Search />,
  },
  {
    path: '/search-v2',
    element: <SearchV2 />,
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
    path: '/preferences',
    element: <Preferences />,
  },
  {
    path: '/whats-new',
    element: <WhatsNew />,
  },
  {
    path: '/recommendations',
    element: <Recommendations />,
  },
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
