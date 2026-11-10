/** Stable `https://thisvid.com/videos/{slug}/` key for dedupe and favourite checks. */
export function canonicalVideoUrl(href: string): string {
  const raw = String(href || '').trim();
  if (!raw) return '';
  try {
    const absolute = raw.startsWith('//') ? `https:${raw}` : raw;
    const url = new URL(absolute, 'https://thisvid.com');
    if (url.hostname !== 'thisvid.com') return '';
    const path = url.pathname.replace(/\/+$/, '').toLowerCase();
    if (!path.includes('/videos/')) return '';
    return `https://thisvid.com${path}/`;
  } catch {
    return '';
  }
}
