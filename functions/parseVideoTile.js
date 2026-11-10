/**
 * Listing-tile parser shared by `videos.js` and `memberFeed.js`.
 * Selectors are coupled to ThisVid markup. The browser copy lives in
 * `src/helpers/parseVideoTile.ts` — keep the two in sync.
 *
 * Returns null for tiles that are not videos (friend cards, albums) or that
 * lack a usable href, instead of throwing on odd markup.
 */

function durationSeconds(duration) {
  const parts = String(duration || '')
    .split(':')
    .map((part) => parseInt(part, 10));
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length >= 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parts[0] * 60 + parts[1];
}

function isVideoHref(href) {
  const raw = String(href || '').trim();
  if (!raw) return false;
  try {
    const u = new URL(raw, 'https://thisvid.com');
    return u.hostname === 'thisvid.com' && u.pathname.includes('/videos/');
  } catch {
    return false;
  }
}

function upgradeProtocol(url) {
  const value = String(url || '').trim();
  if (value.startsWith('//')) return `https:${value}`;
  return value;
}

function parseRatingPercent(text) {
  const match = String(text || '').match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

/**
 * @param {import('cheerio').CheerioAPI} $
 * @param {import('cheerio').Element} element
 */
function parseVideoTile($, element) {
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
    const img = thumb.find('img').first();
    const original = img.attr('data-original') || '';
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

module.exports = {
  durationSeconds,
  isVideoHref,
  parseVideoTile,
};
