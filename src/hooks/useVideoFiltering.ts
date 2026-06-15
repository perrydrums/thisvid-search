import { useState, useEffect, useRef } from 'react';
import { Video, LogParams } from '../helpers/types';
import { filterVideos, sortVideos } from '../helpers/videos';
import { getLocalFavourites } from '../helpers/favourites';
import { updateLogResultCount } from '../helpers/supabase/log';
import { enrichPrivateVideoMemberIds } from '../helpers/videoMemberId';

interface UseVideoFilteringProps {
  params: { [key: string]: any };
  searchObject?: LogParams | null;
  /** v2: default mood from synced profile (falls back to tvass-default-mood in localStorage). */
  syncedDefaultMood?: string;
  /** Profile owner when browsing favourite listings — not the per-video uploader. */
  favouriteListingOwnerId?: string;
}

export const useVideoFiltering = ({
  params,
  searchObject,
  syncedDefaultMood,
  favouriteListingOwnerId = '',
}: UseVideoFilteringProps) => {
  const initialActiveMood = () => {
    if (params.run !== undefined) return '';
    const d = syncedDefaultMood?.trim();
    if (d) return d;
    return localStorage.getItem('tvass-default-mood') || '';
  };

  // Tag-related state
  const [includeTags, setIncludeTags] = useState<string[]>(
    params.tags ? params.tags.split(',') : [],
  );
  const [excludeTags, setExcludeTags] = useState<string[]>(
    params.excludeTags ? params.excludeTags.split(',') : []
  );
  const [boosterTags, setBoosterTags] = useState<string[]>(
    params.boosterTags ? params.boosterTags.split(',') : []
  );
  const [diminishingTags, setDiminishingTags] = useState<string[]>(
    params.diminishingTags ? params.diminishingTags.split(',') : []
  );
  const [termsOperator, setTermsOperator] = useState<'AND' | 'OR'>(
    params.termsOperator || 'OR'
  );

  // Mood and preferences
  const [activeMood, setActiveMood] = useState(initialActiveMood);

  useEffect(() => {
    if (params.run !== undefined) return;
    const d = syncedDefaultMood?.trim();
    if (!d) return;
    setActiveMood(d);
  }, [syncedDefaultMood, params.run]);

  // Video data
  const [rawVideos, setRawVideos] = useState<Video[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);

  // Filtering options
  const [minDuration, setMinDuration] = useState(params.minDuration || 0);
  const [sort, setSort] = useState(params.orderBy || 'relevance');
  const [quick, setQuick] = useState(true);
  const [omitPrivate, setOmitPrivate] = useState(false);
  const [omitFavourites, setOmitFavourites] = useState(false);
  const [preserveResults, setPreserveResults] = useState(false);

  const enrichAttemptedRef = useRef(new Set<string>());
  const rawFirstUrlRef = useRef('');

  const favouriteOwner = favouriteListingOwnerId.trim();

  // Favourite / mixed listings omit uploader on tiles — scrape video pages for private rows.
  useEffect(() => {
    if (rawVideos.length === 0) {
      enrichAttemptedRef.current.clear();
      rawFirstUrlRef.current = '';
      return;
    }

    const first = rawVideos[0]?.url ?? '';
    if (first !== rawFirstUrlRef.current) {
      rawFirstUrlRef.current = first;
      enrichAttemptedRef.current.clear();
    }

    const needsUploader = (v: Video) => {
      if (!v.isPrivate) return false;
      const mid = v.memberId?.trim();
      if (!mid) return true;
      return Boolean(favouriteOwner && mid === favouriteOwner);
    };

    const pending = rawVideos.filter(
      (v) => needsUploader(v) && !enrichAttemptedRef.current.has(v.url),
    );
    if (pending.length === 0) return;

    pending.forEach((v) => enrichAttemptedRef.current.add(v.url));

    let cancelled = false;
    void enrichPrivateVideoMemberIds(pending, {
      rejectMemberIds: favouriteOwner ? [favouriteOwner] : [],
    }).then((enriched) => {
      if (cancelled) return;
      const byUrl = new Map(enriched.map((v) => [v.url, v.memberId]));
      setRawVideos((prev) =>
        prev.map((v) => {
          const memberId = byUrl.get(v.url);
          return memberId ? { ...v, memberId } : v;
        }),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [rawVideos, favouriteOwner]);

  // Apply client-side filtering whenever relevant state changes
  useEffect(() => {
    if (rawVideos.length === 0) return;

    let filteredVideos = filterVideos({
      videos: rawVideos,
      includeTags,
      excludeTags,
      termsOperator,
      boosterTags,
      diminishingTags,
    });

    // Apply favourites filter if enabled
    if (omitFavourites) {
      const favourites = getLocalFavourites();
      filteredVideos = filteredVideos.filter((video) => !favourites.includes(video.url));
    }

    if (omitPrivate) {
      filteredVideos = filteredVideos.filter((video) => !video.isPrivate);
    }

    // Sort the filtered videos
    const sortedVideos = sortVideos(filteredVideos, sort);
    setVideos(sortedVideos);

    // Update log entry if searchObject exists and has an id
    if (searchObject?.id) {
      updateLogResultCount(searchObject.id, sortedVideos.length, searchObject.resultUpdateToken).catch((error) => {
        console.error('Failed to update log result count:', error);
      });
    }
  }, [rawVideos, includeTags, excludeTags, termsOperator, boosterTags, diminishingTags, omitFavourites, omitPrivate, sort, searchObject]);

  // Helper function to reset tags based on mood
  const applyMoodPreferences = (moodPreferences: any) => {
    if (!moodPreferences) return;

    moodPreferences.tags && setIncludeTags(moodPreferences.tags);
    moodPreferences.excludeTags && setExcludeTags(moodPreferences.excludeTags);
    moodPreferences.boosterTags && setBoosterTags(moodPreferences.boosterTags);
    moodPreferences.diminishingTags && setDiminishingTags(moodPreferences.diminishingTags);
    moodPreferences.minDuration !== undefined && setMinDuration(moodPreferences.minDuration || 0);
  };

  const clearMoodPreferences = () => {
    setIncludeTags([]);
    setExcludeTags([]);
    setBoosterTags([]);
    setDiminishingTags([]);
    setMinDuration(0);
  };

  return {
    // Tag state
    includeTags, setIncludeTags,
    excludeTags, setExcludeTags,
    boosterTags, setBoosterTags,
    diminishingTags, setDiminishingTags,
    termsOperator, setTermsOperator,

    // Mood
    activeMood, setActiveMood,

    // Video data
    rawVideos, setRawVideos,
    videos, setVideos,

    // Filtering options
    minDuration, setMinDuration,
    sort, setSort,
    quick, setQuick,
    omitPrivate, setOmitPrivate,
    omitFavourites, setOmitFavourites,
    preserveResults, setPreserveResults,

    // Helper functions
    applyMoodPreferences,
    clearMoodPreferences,
  };
};
