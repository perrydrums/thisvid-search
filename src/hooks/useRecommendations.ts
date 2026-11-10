import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ANALYSE_USERS_STORAGE_KEY,
  type AnalyseFavouriteUsers,
  type HarvestedRelatedVideo,
  analysedVideoUrls,
  loadAnalyseDate,
  loadHarvestedRelated,
} from '../helpers/analyseFavourites';
import { scrapeProfileForSync } from '../helpers/profileSync';
import {
  type HiddenRecommendation,
  deleteExpiredHiddenRecommendations,
  fetchHiddenRecommendations,
  loadLocalHiddenRecommendations,
  mergeHiddenRecommendations,
  saveLocalHiddenRecommendations,
  upsertHiddenRecommendation,
} from '../helpers/supabase/hiddenRecommendations';
import { canonicalVideoUrl } from '../helpers/videoUrl';
import {
  CACHE_TTL_MS,
  type RecommendationProgress,
  type RecommendationsBundle,
  cacheRecommendations,
  extractTasteProfile,
  generateRecommendations,
  getCachedRecommendations,
  isAnalyseStale,
  recommendationCacheKey,
} from '../helpers/recommendations';
import type { RecommendedVideo, TasteProfile } from '../helpers/types';

import { useAuth } from './useAuth';
import { useUserData } from './useUserData';

type InFlight = {
  key: string;
  promise: Promise<RecommendationsBundle>;
};

let inFlight: InFlight | null = null;

function loadAnalyseUsers(): AnalyseFavouriteUsers | null {
  try {
    const raw = localStorage.getItem(ANALYSE_USERS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AnalyseFavouriteUsers;
    if (!parsed || typeof parsed !== 'object' || Object.keys(parsed).length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function useRecommendations() {
  const { user } = useAuth();
  const userData = useUserData();
  const [hidden, setHidden] = useState<HiddenRecommendation[]>(() => loadLocalHiddenRecommendations());
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;
  const [analyseUsers, setAnalyseUsers] = useState<AnalyseFavouriteUsers | null>(null);
  const [related, setRelated] = useState<HarvestedRelatedVideo[]>([]);
  const [analyseDate, setAnalyseDate] = useState('');
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [fromFriends, setFromFriends] = useState<RecommendedVideo[]>([]);
  const [forYou, setForYou] = useState<RecommendedVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<RecommendationProgress | null>(null);
  const [error, setError] = useState('');
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncLabel, setSyncLabel] = useState('');

  useEffect(() => {
    setAnalyseUsers(loadAnalyseUsers());
    setRelated(loadHarvestedRelated());
    setAnalyseDate(loadAnalyseDate());
  }, []);

  useEffect(() => {
    if (!analyseUsers) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    extractTasteProfile(analyseUsers)
      .then((next) => {
        if (!cancelled) setProfile(next);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [analyseUsers]);

  const friendIds = useMemo(() => splitCsv(userData.friendIds), [userData.friendIds]);
  const favouriteUrls = useMemo(() => splitCsv(userData.favourites), [userData.favourites]);
  const analysedUrls = useMemo(
    () => (analyseUsers ? Array.from(analysedVideoUrls(analyseUsers)) : []),
    [analyseUsers],
  );

  const cacheKey = useMemo(() => {
    if (!profile || profile.totalVideos === 0) return '';
    return recommendationCacheKey({
      profile,
      friendIds,
      favouriteUrls,
      selfUserId: userData.thisvidUserId,
      analyseDate,
      related,
    });
  }, [profile, friendIds, favouriteUrls, userData.thisvidUserId, analyseDate, related]);

  const run = useCallback(
    async (key: string, isCancelled: () => boolean) => {
      if (!profile || !key) return;
      setLoading(true);
      setError('');
      setFromFriends([]);
      setForYou([]);
      setProgress({ label: 'Starting', fraction: 0.02 });
      try {
        const start = () =>
          generateRecommendations({
            profile,
            friendIds,
            selfUserId: userData.thisvidUserId,
            favouriteUrls: [...favouriteUrls, ...hiddenRef.current.map((row) => row.url)],
            analysedUrls,
            related,
            onProgress: (next) => {
              if (!isCancelled()) setProgress(next);
            },
            onFriendsReady: (videos) => {
              if (!isCancelled()) setFromFriends(videos);
            },
          });

        let promise: Promise<RecommendationsBundle>;
        if (inFlight?.key === key) {
          promise = inFlight.promise;
        } else {
          promise = start();
          const current = promise;
          inFlight = { key, promise: current };
          current.finally(() => {
            if (inFlight?.promise === current) inFlight = null;
          });
        }

        const bundle = await promise;
        if (isCancelled()) return;
        cacheRecommendations(key, bundle);
        setFromFriends(bundle.fromFriends);
        setForYou(bundle.forYou);
        setCachedAt(Date.now());
        setProgress(null);
      } catch (cause) {
        console.error(cause);
        if (!isCancelled()) setError("Couldn't load recommendations. Try again.");
      } finally {
        if (!isCancelled()) setLoading(false);
      }
    },
    [profile, friendIds, userData.thisvidUserId, favouriteUrls, analysedUrls, related],
  );

  useEffect(() => {
    if (userData.loading || !cacheKey || !profile) return;
    const cached = getCachedRecommendations(cacheKey);
    if (cached) {
      setFromFriends(cached.fromFriends);
      setForYou(cached.forYou);
      setCachedAt(cached.timestamp);
      setLoading(false);
      setProgress(null);
      return;
    }

    let cancelled = false;
    void run(cacheKey, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [userData.loading, cacheKey, profile, run]);

  useEffect(() => {
    let cancelled = false;

    async function loadHidden() {
      const local = loadLocalHiddenRecommendations();
      const authUserId = user?.id;
      if (!authUserId) {
        if (!cancelled) setHidden(local);
        return;
      }

      const remote = await fetchHiddenRecommendations();
      if (cancelled) return;

      const merged = mergeHiddenRecommendations(local, remote ?? []);
      setHidden(merged);
      saveLocalHiddenRecommendations(merged);

      if (!remote) return;

      const remoteByUrl = new Map(remote.map((row) => [row.url, row.hiddenAt]));
      const toPush = local.filter((row) => {
        const existing = remoteByUrl.get(row.url);
        return !existing || existing < row.hiddenAt;
      });
      await Promise.all(
        toPush.map((row) => upsertHiddenRecommendation(authUserId, row.url, row.hiddenAt)),
      );
      if (!cancelled) await deleteExpiredHiddenRecommendations();
    }

    void loadHidden();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const hiddenUrls = useMemo(
    () => new Set(hidden.map((row) => row.url)),
    [hidden],
  );

  const visibleFromFriends = useMemo(
    () => fromFriends.filter((video) => !hiddenUrls.has(canonicalVideoUrl(video.url))),
    [fromFriends, hiddenUrls],
  );

  const visibleForYou = useMemo(
    () => forYou.filter((video) => !hiddenUrls.has(canonicalVideoUrl(video.url))),
    [forYou, hiddenUrls],
  );

  const hideRecommendation = useCallback(
    async (url: string) => {
      const canonical = canonicalVideoUrl(url);
      if (!canonical) return;

      const previous = hiddenRef.current;
      const hiddenAt = new Date().toISOString();
      const next = mergeHiddenRecommendations(previous, [{ url: canonical, hiddenAt }]);
      hiddenRef.current = next;
      setHidden(next);
      saveLocalHiddenRecommendations(next);

      if (!user?.id) return;

      const saved = await upsertHiddenRecommendation(user.id, canonical, hiddenAt);
      if (saved) return;

      hiddenRef.current = previous;
      setHidden(previous);
      saveLocalHiddenRecommendations(previous);
      setError("Couldn't hide that video. Try again.");
    },
    [user?.id],
  );

  const refresh = useCallback(() => {
    if (!cacheKey || loading) return;
    inFlight = null;
    void run(cacheKey, () => false);
  }, [cacheKey, loading, run]);

  const syncProfile = useCallback(async () => {
    const userId = userData.thisvidUserId.trim();
    if (!userId || syncing) return;
    setSyncing(true);
    setSyncLabel('Syncing…');
    setError('');
    try {
      const scraped = await scrapeProfileForSync(userId, (done, total) => {
        setSyncLabel(total > 0 ? `Syncing ${done}/${total}` : 'Syncing…');
      });
      await userData.setProfileSync(scraped);
      setSyncLabel('');
    } catch (cause) {
      console.error(cause);
      setError("Couldn't sync your profile. Check the user ID and try again.");
      setSyncLabel('');
    } finally {
      setSyncing(false);
    }
  }, [userData, syncing]);

  const analysedCount = profile?.totalVideos ?? 0;
  const stale = isAnalyseStale(favouriteUrls.length, analysedCount);

  return {
    loading: loading || userData.loading || profileLoading,
    refreshing: loading,
    progress,
    error,
    profile,
    fromFriends: visibleFromFriends,
    forYou: visibleForYou,
    hideRecommendation,
    cachedAt,
    cacheTtlMs: CACHE_TTL_MS,
    userId: userData.thisvidUserId,
    setUserId: userData.setThisvidUserId,
    friendCount: friendIds.length,
    favouriteCount: favouriteUrls.length,
    analysedCount,
    analyseDate,
    hasRelated: related.length > 0,
    stale,
    syncing,
    syncLabel,
    syncProfile,
    refresh,
  };
}
