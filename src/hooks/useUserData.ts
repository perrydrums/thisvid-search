import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';

import type { Mood } from '../helpers/types';
import {
  fetchMoodsForUser,
  fetchProfile,
  mirrorProfileToLocalStorage,
  replaceAllMoodsForUser,
  syncLocalStorageToProfile,
  updateProfile,
} from '../helpers/supabase/userProfile';

import { useAuth } from './useAuth';

export function loadMoodsFromLocalStorage(): Mood[] {
  try {
    const raw = localStorage.getItem('tvass-moods');
    return raw ? (JSON.parse(raw) as Mood[]) : [];
  } catch {
    return [];
  }
}

function readLocalScalars() {
  return {
    thisvidUserId: localStorage.getItem('tvass-user-id') || '',
    defaultMood: localStorage.getItem('tvass-default-mood') || '',
    favourites: localStorage.getItem('tvass-favourites') || '',
    lastSyncDate: localStorage.getItem('tvass-last-sync-date') || '',
  };
}

function writeLocalScalars(sc: {
  thisvidUserId: string;
  defaultMood: string;
  favourites: string;
  lastSyncDate: string;
}) {
  localStorage.setItem('tvass-user-id', sc.thisvidUserId);
  localStorage.setItem('tvass-default-mood', sc.defaultMood);
  localStorage.setItem('tvass-favourites', sc.favourites);
  localStorage.setItem('tvass-last-sync-date', sc.lastSyncDate);
}

function writeLocalMoods(moods: Mood[]) {
  localStorage.setItem('tvass-moods', JSON.stringify(moods));
}

type UserDataBundle = {
  moods: Mood[];
  thisvidUserId: string;
  defaultMood: string;
  favourites: string;
  lastSyncDate: string;
};

const emptyBundleLocal = (): UserDataBundle => ({
  moods: loadMoodsFromLocalStorage(),
  ...readLocalScalars(),
});

/** v2 shell: moods + prefs from Supabase when logged in, else legacy localStorage keys. */
export const useUserData = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bundle, setBundle] = useState<UserDataBundle>(() => emptyBundleLocal());

  /** Keeps UI from treating cloud data as not ready before the remote load kicks in (avoids a race where Settings runs while loading is still false). */
  useLayoutEffect(() => {
    setLoading(Boolean(user?.id));
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user?.id) {
        const next = emptyBundleLocal();
        if (!cancelled) {
          setBundle(next);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) setLoading(true);
      try {
        await syncLocalStorageToProfile(user.id);
        const profile = await fetchProfile(user.id);
        const moodRows = await fetchMoodsForUser(user.id);

        if (cancelled) return;

        if (profile) {
          mirrorProfileToLocalStorage(profile, moodRows);
          setBundle({
            moods: moodRows,
            thisvidUserId: profile.thisvid_user_id || '',
            defaultMood: profile.default_mood || '',
            favourites: (profile.favourites || []).join(','),
            lastSyncDate: profile.last_sync_date || '',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const persistScalars = useCallback(
    async (partial: Partial<Omit<UserDataBundle, 'moods'>>) => {
      setBundle((prev) => {
        const next: UserDataBundle = {
          moods: prev.moods,
          thisvidUserId: partial.thisvidUserId ?? prev.thisvidUserId,
          defaultMood: partial.defaultMood ?? prev.defaultMood,
          favourites: partial.favourites ?? prev.favourites,
          lastSyncDate: partial.lastSyncDate ?? prev.lastSyncDate,
        };
        writeLocalScalars({
          thisvidUserId: next.thisvidUserId,
          defaultMood: next.defaultMood,
          favourites: next.favourites,
          lastSyncDate: next.lastSyncDate,
        });

        Promise.resolve().then(async () => {
          if (!user?.id) return;
          const favParts = next.favourites
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          await updateProfile(user.id, {
            thisvid_user_id: next.thisvidUserId || null,
            default_mood: next.defaultMood || null,
            favourites: favParts,
            last_sync_date: next.lastSyncDate || null,
          });
        });

        return next;
      });
    },
    [user?.id],
  );

  const persistMoods = useCallback(
    async (nextMoods: Mood[]) => {
      writeLocalMoods(nextMoods);
      setBundle((prev) => ({ ...prev, moods: nextMoods }));

      if (user?.id) {
        await replaceAllMoodsForUser(user.id, nextMoods);
      }
    },
    [user?.id],
  );

  const setDefaultMood = useCallback(
    async (name: string) => {
      await persistScalars({ defaultMood: name });
    },
    [persistScalars],
  );

  const setFavouritesAndLastSync = useCallback(
    async (favouritesCsv: string, lastSync: string) => {
      await persistScalars({ favourites: favouritesCsv, lastSyncDate: lastSync });
    },
    [persistScalars],
  );

  const refreshProfileFromCloud = useCallback(async (opts?: { quiet?: boolean }) => {
    const authId = user?.id;
    if (!authId) return;

    if (!opts?.quiet) setLoading(true);
    try {
      const profile = await fetchProfile(authId);
      const moodRows = await fetchMoodsForUser(authId);
      if (!profile) return;

      mirrorProfileToLocalStorage(profile, moodRows);
      setBundle({
        moods: moodRows,
        thisvidUserId: profile.thisvid_user_id || '',
        defaultMood: profile.default_mood || '',
        favourites: (profile.favourites || []).join(','),
        lastSyncDate: profile.last_sync_date || '',
      });
    } finally {
      if (!opts?.quiet) setLoading(false);
    }
  }, [user?.id]);

  return useMemo(
    () => ({
      loading,
      isCloud: Boolean(user?.id),
      moods: bundle.moods,
      persistMoods,
      thisvidUserId: bundle.thisvidUserId,
      setThisvidUserId: (v: string) => persistScalars({ thisvidUserId: v }),
      defaultMood: bundle.defaultMood,
      setDefaultMood,
      favourites: bundle.favourites,
      setFavourites: (v: string) => persistScalars({ favourites: v }),
      lastSyncDate: bundle.lastSyncDate,
      setLastSyncDate: (v: string) => persistScalars({ lastSyncDate: v }),
      setFavouritesAndLastSync,
      refreshProfileFromCloud,
    }),
    [
      bundle,
      loading,
      user?.id,
      persistMoods,
      persistScalars,
      setDefaultMood,
      setFavouritesAndLastSync,
      refreshProfileFromCloud,
    ],
  );
};
