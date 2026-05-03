/**
 * Optional abuse gate: set SITE_ALLOWED_ORIGINS to a comma-separated list of allowed
 * origins, e.g. "https://tvass.netlify.app,http://localhost:3000"
 * When unset, checks are skipped (backward compatible).
 */
function requireSiteOrigin(event) {
  const raw = process.env.SITE_ALLOWED_ORIGINS;
  if (!raw || !String(raw).trim()) {
    return null;
  }

  const allowed = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const headers = event.headers || {};
  const originHeader =
    headers.origin ?? headers.Origin ?? headers['x-forwarded-origin'] ?? '';
  const refererHeader = headers.referer ?? headers.Referer ?? headers.referrer ?? '';

  const candidate =
    (typeof originHeader === 'string' && originHeader.trim()) ||
    (typeof refererHeader === 'string' && refererHeader.trim()) ||
    '';

  const forbiddenBody = JSON.stringify({
    status: 'Forbidden',
    success: false,
    message: 'Request not allowed',
  });

  if (!candidate) {
    console.warn('allowedOrigins: blocked request without Origin/Referer');
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: forbiddenBody,
    };
  }

  /** @type {string} */
  let reqOrigin;
  try {
    reqOrigin = new URL(candidate).origin;
  } catch {
    console.warn('allowedOrigins: could not parse origin from header');
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: forbiddenBody,
    };
  }

  const ok = allowed.some((entry) => {
    try {
      return new URL(entry).origin === reqOrigin;
    } catch {
      return false;
    }
  });

  if (!ok) {
    console.warn('allowedOrigins: origin not allowed', reqOrigin);
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: forbiddenBody,
    };
  }

  return null;
}

module.exports = { requireSiteOrigin };
