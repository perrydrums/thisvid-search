import cheerio from 'cheerio';

/**
 * Browser copy of `functions/parseVideoTile.js`.
 * Cheerio selectors must stay aligned with that file: CRA cannot import `functions/`.
 */

type CheerioRoot = ReturnType<typeof cheerio.load>;

export type ParsedTile = {
  title: string;
  url: string;
  isPrivate: boolean;
  duration: string;
  avatar: string;
  views: number;
  date: string;
  rating: number | null;
  relevance: number;
};

function isVideoHref(href: string): boolean {
  const raw = String(href || '').trim();
  if (!raw) return false;
  try {
    const url = new URL(raw, 'https://thisvid.com');
    return url.hostname === 'thisvid.com' && url.pathname.includes('/videos/');
  } catch {
    return false;
  }
}

function upgradeProtocol(value: string): string {
  const trimmed = String(value || '').trim();
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return trimmed;
}

function parseRatingPercent(text: string): number | null {
  const match = String(text || '').match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

/** Cheerio 1.0.0-rc.10 does not export an element type; the node is whatever `.each` passes. */
export function parseVideoTile($: CheerioRoot, element: any): ParsedTile | null {
  const $el = $(element);
  const url = ($el.attr('href') || '').trim();
  if (!isVideoHref(url)) return null;

  const title = ($el.attr('title') || $el.find('.title').first().text() || '').trim();
  const thumb = $el.find('span.thumb').first();
  const isPrivate = thumb.hasClass('private') || $el.find('span').first().hasClass('private');

  let avatar = '';
  if (isPrivate) {
    const style = thumb.attr('style') || $el.find('span').first().attr('style') || '';
    const match = style.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
    if (match) avatar = upgradeProtocol(match[1]);
  } else {
    const original = thumb.find('img').first().attr('data-original') || '';
    if (original && !original.startsWith('data:')) {
      avatar = upgradeProtocol(original);
    }
  }

  const viewsMatch = $el.find('.view').first().text().match(/\d+/);
  const views = viewsMatch ? parseInt(viewsMatch[0], 10) : 0;
  const date = $el.find('.date').first().text().replace(/\s+/g, ' ').trim();
  const duration = $el.find('span.duration').first().text().replace(/\s+/g, ' ').trim();
  const rating = parseRatingPercent($el.find('.percent').first().text());

  return {
    title,
    url,
    isPrivate,
    duration,
    avatar,
    views,
    date,
    rating,
    relevance: 0,
  };
}
