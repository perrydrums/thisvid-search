import React from 'react';
import { Tooltip } from 'react-tooltip';
import InputTags from '../input/Tags';

interface SearchFiltersProps {
  advanced: boolean;
  includeTags: string[];
  setIncludeTags: (tags: string[]) => void;
  excludeTags: string[];
  setExcludeTags: (tags: string[]) => void;
  boosterTags: string[];
  setBoosterTags: (tags: string[]) => void;
  diminishingTags: string[];
  setDiminishingTags: (tags: string[]) => void;
  termsOperator: 'AND' | 'OR';
  setTermsOperator: (operator: 'AND' | 'OR') => void;
  minDuration: number;
  setMinDuration: (duration: number | null) => void;
  start: number;
  setStart: (start: number) => void;
  amount: number;
  setAmount: (amount: number) => void;
  pageLimit: number;
  omitFavourites: boolean;
  setOmitFavourites: (omit: boolean) => void;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  advanced,
  includeTags,
  setIncludeTags,
  excludeTags,
  setExcludeTags,
  boosterTags,
  setBoosterTags,
  diminishingTags,
  setDiminishingTags,
  termsOperator,
  setTermsOperator,
  minDuration,
  setMinDuration,
  start,
  setStart,
  amount,
  setAmount,
  pageLimit,
  omitFavourites,
  setOmitFavourites,
}) => {
  return (
    <>
      <div className="form-columns form-columns-group">
        <label htmlFor="tags">Title</label>
        <InputTags
          tags={includeTags}
          setTags={setIncludeTags}
          tooltip={`Find videos with ${
            termsOperator === 'AND' ? 'all' : 'any'
          } of these words in the title.`}
        />
        {advanced && (
          <>
            <label htmlFor="tags-operator">Operator</label>
            <div>
              <div className="select-wrapper">
                <select
                  id="tags-operator"
                  value={termsOperator}
                  required
                  onChange={(e) => setTermsOperator(e.target.value as 'AND' | 'OR')}
                  data-tooltip-id="tags-operator-tooltip"
                >
                  <option value="OR">OR</option>
                  <option value="AND">AND</option>
                </select>
              </div>
              <Tooltip
                id="tags-operator-tooltip"
                className="label-tooltip"
                place="left-start"
              >
                OR will return videos that contain <b>any</b> of the tags. AND will return
                videos that contain <b>all</b> of the tags.
              </Tooltip>
            </div>

            <label htmlFor="exclude-tags">Title does not contain</label>
            <InputTags
              htmlId="exclude-tags"
              tags={excludeTags}
              setTags={setExcludeTags}
              tooltip="Videos with these tags will be excluded from the search results."
            />
            <label htmlFor="booster-tags">Booster tags</label>
            <InputTags
              htmlId="booster-tags"
              tags={boosterTags}
              setTags={setBoosterTags}
              tooltip="Videos with these tags will be boosted to the top of the search results, when sorting by relevance."
            />
            <label htmlFor="diminishing-tags">Diminishing tags</label>
            <InputTags
              htmlId="diminishing-tags"
              tags={diminishingTags}
              setTags={setDiminishingTags}
              tooltip="Videos with these tags will be lower in the search results, when sorting by relevance."
            />
          </>
        )}
      </div>
      <div className="form-columns">
        {advanced && (
          <>
            <label htmlFor="start">Start Page</label>
            <input
              type="number"
              id="start"
              value={start}
              required
              onChange={(e) => setStart(parseInt(e.target.value))}
            />
            <div></div>
            <div>
              <input
                type="checkbox"
                id="omit-favourites"
                checked={omitFavourites}
                onChange={() => setOmitFavourites(!omitFavourites)}
              />
              <label htmlFor="omit-favourites" className="checkbox-button">
                Omit Favourites
              </label>
            </div>
          </>
        )}
        <label htmlFor="min-duration">Min Duration (minutes)</label>
        <input
          type="number"
          min="0"
          id="min-duration"
          value={minDuration}
          onChange={(e) => setMinDuration(parseInt(e.target.value) || null)}
        />
        <label htmlFor="amount">Number of Pages</label>
        <div style={{ position: 'relative' }}>
          <input
            type="number"
            min="0"
            max={pageLimit || 100}
            id="amount"
            value={amount}
            required
            onChange={(e) => setAmount(parseInt(e.target.value))}
          />
          <div className="amount-suffix"> of {pageLimit - start + 1} remaining</div>
        </div>
      </div>
    </>
  );
};
