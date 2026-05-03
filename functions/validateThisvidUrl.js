const LISTING_BASE = 'https://thisvid.com';

function bad(message) {
  const err = new Error(message);
  err.code = 'INVALID_THISVID_URL';
  return err;
}

/** Path segment used as `LISTING_BASE + path` for listing HTML fetch (videos.js). */
function assertSafeListingPath(raw) {
  const initial = String(raw ?? '').trim();
  if (!initial) {
    throw bad('Missing url');
  }

  let s = initial;
  for (let i = 0; i < 5; i += 1) {
    try {
      const decoded = decodeURIComponent(s);
      if (decoded === s) break;
      s = decoded;
    } catch {
      break;
    }
  }

  const lower = s.toLowerCase();
  if (!s.startsWith('/')) {
    throw bad('Listing path must start with /');
  }
  if (lower.includes('//') || lower.includes('@') || lower.includes('\\')) {
    throw bad('Invalid listing path');
  }

  const u = new URL(s, `${LISTING_BASE}/`);
  if (u.origin !== LISTING_BASE) {
    throw bad('Invalid listing origin');
  }
  if (u.username || u.password) {
    throw bad('Invalid URL');
  }

  return u.pathname + u.search + u.hash;
}

/** Absolute page URL only: https://thisvid.com/... — for goto() and arbitrary fetches (download/videoDetails/quick=false). */
function assertAbsoluteThisvidHttps(raw) {
  const initial = String(raw ?? '').trim();
  if (!initial) {
    throw bad('Missing URL');
  }

  let s = initial;
  for (let i = 0; i < 5; i += 1) {
    try {
      const decoded = decodeURIComponent(s);
      if (decoded === s) break;
      s = decoded;
    } catch {
      break;
    }
  }

  const u = new URL(s.startsWith('//') ? `https:${s}` : s);

  if (u.protocol !== 'https:') {
    throw bad('URL must use https');
  }
  if (u.hostname !== 'thisvid.com') {
    throw bad('Host must be thisvid.com');
  }
  if (u.username || u.password) {
    throw bad('Invalid URL');
  }

  return u.href;
}

/** Href straight from scraped HTML — may be protocol-relative or site-relative. */
function resolvePageHrefToThisvid(href) {
  const h = String(href ?? '').trim();
  if (!h) {
    throw bad('Missing href');
  }
  if (h.startsWith('//')) {
    return assertAbsoluteThisvidHttps(`https:${h}`);
  }
  if (h.startsWith('/')) {
    return assertAbsoluteThisvidHttps(LISTING_BASE + h);
  }
  return assertAbsoluteThisvidHttps(h);
}

module.exports = {
  LISTING_BASE,
  assertSafeListingPath,
  assertAbsoluteThisvidHttps,
  resolvePageHrefToThisvid,
};
