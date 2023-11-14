import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';

import './index.css';
import Analyse from './pages/Analyse';
import Home from './pages/Home';
import Preferences from './pages/Preferences';
import Search from './pages/Search';

// Generate random visitor ID if not already set in local storage.
if (!localStorage.getItem('visitorId')) {
  localStorage.setItem('visitorId', Math.random().toString(36).substring(2));
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
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
