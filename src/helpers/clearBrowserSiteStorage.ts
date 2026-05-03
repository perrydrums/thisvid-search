/** Wipes quota storage for this origin (prefs, moods, caches, visitor id, Supabase session keys). */
export function clearBrowserSiteStorage(): void {
  try {
    localStorage.clear();
  } catch {
    /* private mode / blocked */
  }
  try {
    sessionStorage.clear();
  } catch {
    /* private mode / blocked */
  }
}
