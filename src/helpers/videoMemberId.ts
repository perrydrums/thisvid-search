import cheerio from 'cheerio';

import { extractMemberIdFromProfileHref } from './friendIds';
import type { Video } from './types';

/** Same-origin path for fetch (proxied to ThisVid in dev + prod). */
export function hrefToProxiedPath(href: string): string {
  const { pathname, search } = new URL(href, 'https://thisvid.com');
  return `${pathname}${search}`;
}

/** Parse uploader member ID from a scraped video page (`/videos/…`). */
export function parseMemberIdFromVideoHtml(html: string): string {
  const $ = cheerio.load(html);
  const userUrl =
    $('.box ul.description').first().find('li:nth-child(4) a').first().attr('href') ||
    $('ul.description a[href*="/members/"]').first().attr('href') ||
    '';
  return extractMemberIdFromProfileHref(userUrl);
}

export async function fetchMemberIdForVideoUrl(videoUrl: string): Promise<string> {
  try {
    const path = hrefToProxiedPath(videoUrl);
    const res = await fetch(path);
    if (!res.ok) return '';
    const html = await res.text();
    return parseMemberIdFromVideoHtml(html);
  } catch {
    return '';
  }
}

const ENRICH_BATCH = 8;

/** Fill missing `memberId` on private rows (e.g. favourite listings) via video page scrape. */
export async function enrichPrivateVideoMemberIds(
  videos: Video[],
  options?: { rejectMemberIds?: string[] },
): Promise<Video[]> {
  const reject = new Set(
    (options?.rejectMemberIds ?? []).map((s) => s.trim()).filter(Boolean),
  );
  const needsUploader = (v: Video) => {
    if (!v.isPrivate) return false;
    const mid = v.memberId?.trim();
    if (!mid) return true;
    return reject.has(mid);
  };

  const toEnrich = videos.filter(needsUploader);
  if (toEnrich.length === 0) return videos;

  const updates = new Map<string, string>();
  for (let i = 0; i < toEnrich.length; i += ENRICH_BATCH) {
    const batch = toEnrich.slice(i, i + ENRICH_BATCH);
    const rows = await Promise.all(
      batch.map(async (v) => ({ url: v.url, memberId: await fetchMemberIdForVideoUrl(v.url) })),
    );
    for (const row of rows) {
      if (row.memberId) updates.set(row.url, row.memberId);
    }
  }

  if (updates.size === 0) return videos;
  return videos.map((v) => (updates.has(v.url) ? { ...v, memberId: updates.get(v.url) } : v));
}
