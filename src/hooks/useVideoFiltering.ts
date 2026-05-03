import { useState, useEffect } from 'react';
import { Video, LogParams } from '../helpers/types';
import { filterVideos, sortVideos } from '../helpers/videos';
import { getLocalFavourites } from '../helpers/favourites';
import { updateLogResultCount } from '../helpers/supabase/log';

interface UseVideoFilteringProps {
  params: { [key: string]: any };
  searchObject?: LogParams | null;
  /** v2: default mood from synced profile (falls back to tvass-default-mood in localStorage). */
  syncedDefaultMood?: string;
}

export const useVideoFiltering = ({ params, searchObject, syncedDefaultMood }: UseVideoFilteringProps) => {
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

    // Sort the filtered videos
    const sortedVideos = sortVideos(filteredVideos, sort);
    setVideos(sortedVideos);

    // Update log entry if searchObject exists and has an id
    if (searchObject?.id) {
      updateLogResultCount(searchObject.id, sortedVideos.length, searchObject.resultUpdateToken).catch((error) => {
        console.error('Failed to update log result count:', error);
      });
    }
  }, [rawVideos, includeTags, excludeTags, termsOperator, boosterTags, diminishingTags, omitFavourites, sort, searchObject]);

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
