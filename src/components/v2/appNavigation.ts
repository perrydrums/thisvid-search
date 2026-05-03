export type AppSidebarActivePage = 'search' | 'moods' | 'history' | 'settings';

export const APP_NAV_ITEMS: {
  page: AppSidebarActivePage;
  to: string;
  icon: string;
  label: string;
}[] = [
  { page: 'search', to: '/search-v2', icon: 'search', label: 'Search' },
  { page: 'moods', to: '/moods', icon: 'mood', label: 'Moods' },
  { page: 'history', to: '/history', icon: 'history', label: 'History' },
  { page: 'settings', to: '/settings', icon: 'settings', label: 'Settings' },
];
