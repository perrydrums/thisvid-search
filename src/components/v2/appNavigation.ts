export type AppSidebarActivePage = 'search' | 'analyse' | 'moods' | 'history' | 'settings';

export const APP_NAV_ITEMS: {
  page: AppSidebarActivePage;
  to: string;
  icon: string;
  label: string;
}[] = [
  { page: 'search', to: '/search', icon: 'search', label: 'Search' },
  { page: 'analyse', to: '/analyse', icon: 'analytics', label: 'Analyse' },
  { page: 'moods', to: '/moods', icon: 'mood', label: 'Moods' },
  { page: 'history', to: '/history', icon: 'history', label: 'History' },
  { page: 'settings', to: '/settings', icon: 'settings', label: 'Settings' },
];
