/** ISO timestamp for profile sync fields (`timestamptz` in Supabase). */
export function createSyncTimestamp(): string {
  return new Date().toISOString();
}

/** Coerce stored sync values to ISO for Postgres; returns null when empty/invalid. */
export function normalizeSyncTimestampForDb(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  const euMatch = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (euMatch) {
    const [, day, month, year, hour, minute, second = '0'] = euMatch;
    const d = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

export function formatSyncTimestampForDisplay(value: string | null | undefined): string {
  if (!value?.trim()) return '—';
  const iso = normalizeSyncTimestampForDb(value);
  if (!iso) return value;
  return new Date(iso).toLocaleString();
}
