/** Slider / open-ended max cap (1 hour) in seconds. */
export const DURATION_SLIDER_MAX_SECONDS = 3600;

export const formatDurationHms = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export const formatDurationRangeHms = (
  minSeconds: number,
  maxSeconds: number | null,
  sliderMax = DURATION_SLIDER_MAX_SECONDS,
): string => {
  const minLabel = formatDurationHms(minSeconds);
  if (maxSeconds == null || maxSeconds >= sliderMax) {
    return `${minLabel} - ${formatDurationHms(sliderMax)}+`;
  }
  return `${minLabel} - ${formatDurationHms(maxSeconds)}`;
};

export const parseDurationHms = (text: string): number | null => {
  const t = text.trim();
  if (!t) return 0;
  const parts = t.split(':').map((p) => parseInt(p.trim(), 10));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
};

export type ParsedDurationRange = { min: number; max: number | null };

export const parseDurationRangeText = (text: string): ParsedDurationRange | null => {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const sep = trimmed.includes(' - ') ? ' - ' : '-';
  const idx = trimmed.indexOf(sep);
  if (idx === -1) return null;

  const minPart = trimmed.slice(0, idx).trim();
  let maxPart = trimmed.slice(idx + sep.length).trim();
  const min = parseDurationHms(minPart);
  if (min === null || min < 0 || min > DURATION_SLIDER_MAX_SECONDS) return null;

  let max: number | null;
  if (maxPart.endsWith('+')) {
    maxPart = maxPart.slice(0, -1).trim();
    max = null;
  } else {
    const parsedMax = parseDurationHms(maxPart);
    if (parsedMax === null || parsedMax < 0) return null;
    if (parsedMax >= DURATION_SLIDER_MAX_SECONDS) max = null;
    else max = parsedMax;
  }

  if (max !== null && min > max) return null;
  return { min, max };
};

/** v2 share URLs use `minDurationSec` / `maxDurationSec`; legacy `minDuration` / `maxDuration` are minutes. */
export const parseMinDurationParamSeconds = (params: Record<string, unknown>): number => {
  if (params.minDurationSec !== undefined && String(params.minDurationSec).trim() !== '') {
    const n = Number(params.minDurationSec);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }
  const legacy = Number(params.minDuration);
  return Number.isFinite(legacy) && legacy > 0 ? Math.floor(legacy) * 60 : 0;
};

export const parseMaxDurationParamSeconds = (params: Record<string, unknown>): number | null => {
  if (params.maxDurationSec !== undefined && String(params.maxDurationSec).trim() !== '') {
    const n = Number(params.maxDurationSec);
    if (!Number.isFinite(n) || n <= 0) return null;
    if (n >= DURATION_SLIDER_MAX_SECONDS) return null;
    return Math.floor(n);
  }
  if (params.maxDuration === undefined || String(params.maxDuration).trim() === '') return null;
  const legacy = Number(params.maxDuration);
  if (!Number.isFinite(legacy) || legacy <= 0) return null;
  if (legacy >= 60) return null;
  return Math.floor(legacy) * 60;
};
