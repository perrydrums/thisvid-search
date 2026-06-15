import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  FRIEND_IDS_STORAGE_KEY,
  FRIENDS_LAST_SYNC_STORAGE_KEY,
} from '../helpers/friendIds';
import {
  fetchMoodsForUser,
  fetchProfile,
  mirrorProfileToLocalStorage,
  replaceAllMoodsForUser,
  syncLocalStorageToProfile,
  updateProfile,
} from '../helpers/supabase/userProfile';
import { normalizeSyncTimestampForDb } from '../helpers/syncTimestamp';
import type { Mood } from '../helpers/types';

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
    friendIds: localStorage.getItem(FRIEND_IDS_STORAGE_KEY) || '',
    friendsLastSyncDate: localStorage.getItem(FRIENDS_LAST_SYNC_STORAGE_KEY) || '',
  };
}

function writeLocalScalars(sc: {
  thisvidUserId: string;
  defaultMood: string;
  favourites: string;
  lastSyncDate: string;
  friendIds: string;
  friendsLastSyncDate: string;
}) {
  localStorage.setItem('tvass-user-id', sc.thisvidUserId);
  localStorage.setItem('tvass-default-mood', sc.defaultMood);
  localStorage.setItem('tvass-favourites', sc.favourites);
  localStorage.setItem('tvass-last-sync-date', sc.lastSyncDate);
  localStorage.setItem(FRIEND_IDS_STORAGE_KEY, sc.friendIds);
  localStorage.setItem(FRIENDS_LAST_SYNC_STORAGE_KEY, sc.friendsLastSyncDate);
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
  friendIds: string;
  friendsLastSyncDate: string;
};

const emptyBundleLocal = (): UserDataBundle => ({
  moods: loadMoodsFromLocalStorage(),
  ...readLocalScalars(),
});

function mergeScalars(
  prev: UserDataBundle,
  partial: Partial<Omit<UserDataBundle, 'moods'>>,
): UserDataBundle {
  const nextLastSync =
    partial.lastSyncDate !== undefined
      ? normalizeSyncTimestampForDb(partial.lastSyncDate) ?? ''
      : prev.lastSyncDate;
  const nextFriendsLastSync =
    partial.friendsLastSyncDate !== undefined
      ? normalizeSyncTimestampForDb(partial.friendsLastSyncDate) ?? ''
      : prev.friendsLastSyncDate;
  return {
    moods: prev.moods,
    thisvidUserId: partial.thisvidUserId ?? prev.thisvidUserId,
    defaultMood: partial.defaultMood ?? prev.defaultMood,
    favourites: partial.favourites ?? prev.favourites,
    lastSyncDate: nextLastSync,
    friendIds: partial.friendIds ?? prev.friendIds,
    friendsLastSyncDate: nextFriendsLastSync,
  };
}

/** v2 shell: moods + prefs from Supabase when logged in, else legacy localStorage keys. */
export const useUserData = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bundle, setBundle] = useState<UserDataBundle>(() => emptyBundleLocal());
  const bundleRef = useRef(bundle);
  bundleRef.current = bundle;

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
          bundleRef.current = next;
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
          const loaded = {
            moods: moodRows,
            thisvidUserId: profile.thisvid_user_id || '',
            defaultMood: profile.default_mood || '',
            favourites: (profile.favourites || []).join(','),
            lastSyncDate: profile.last_sync_date || '',
            friendIds: (profile.friend_ids || []).join(','),
            friendsLastSyncDate: profile.friends_last_sync_date || '',
          };
          bundleRef.current = loaded;
          setBundle(loaded);
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
      const next = mergeScalars(bundleRef.current, partial);
      writeLocalScalars({
        thisvidUserId: next.thisvidUserId,
        defaultMood: next.defaultMood,
        favourites: next.favourites,
        lastSyncDate: next.lastSyncDate,
        friendIds: next.friendIds,
        friendsLastSyncDate: next.friendsLastSyncDate,
      });
      bundleRef.current = next;
      setBundle(next);

      if (!user?.id) return;

      const favParts = next.favourites
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const friendParts = next.friendIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const ok = await updateProfile(user.id, {
        thisvid_user_id: next.thisvidUserId || null,
        default_mood: next.defaultMood || null,
        favourites: favParts,
        last_sync_date: next.lastSyncDate || null,
        friend_ids: friendParts,
        friends_last_sync_date: next.friendsLastSyncDate || null,
      });
      if (!ok) {
        throw new Error('Failed to save profile to Supabase');
      }
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

  const setFriendsAndLastSync = useCallback(
    async (friendIdsCsv: string, friendsLastSync: string) => {
      await persistScalars({ friendIds: friendIdsCsv, friendsLastSyncDate: friendsLastSync });
    },
    [persistScalars],
  );

  const setProfileSync = useCallback(
    async (data: {
      favouritesCsv: string;
      friendIdsCsv: string;
      lastSync: string;
      friendsLastSync: string;
    }) => {
      await persistScalars({
        favourites: data.favouritesCsv,
        friendIds: data.friendIdsCsv,
        lastSyncDate: data.lastSync,
        friendsLastSyncDate: data.friendsLastSync,
      });
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
      const loaded = {
        moods: moodRows,
        thisvidUserId: profile.thisvid_user_id || '',
        defaultMood: profile.default_mood || '',
        favourites: (profile.favourites || []).join(','),
        lastSyncDate: profile.last_sync_date || '',
        friendIds: (profile.friend_ids || []).join(','),
        friendsLastSyncDate: profile.friends_last_sync_date || '',
      };
      bundleRef.current = loaded;
      setBundle(loaded);
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
      friendIds: bundle.friendIds,
      friendsLastSyncDate: bundle.friendsLastSyncDate,
      setFriendsAndLastSync,
      setProfileSync,
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
      setFriendsAndLastSync,
      setProfileSync,
      refreshProfileFromCloud,
    ],
  );
};
