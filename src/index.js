import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';

import { getNameWithSeed } from './helpers/users';
import './index.css';
import Analyse from './pages/Analyse';
import Home from './pages/Home';
import Preferences from './pages/Preferences';
import Search from './pages/Search';
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
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
