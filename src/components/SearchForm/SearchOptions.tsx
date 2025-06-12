import React from 'react';
import { Tooltip } from 'react-tooltip';

interface SearchOptionsProps {
  quick: boolean;
  setQuick: (quick: boolean) => void;
  preserveResults: boolean;
  setPreserveResults: (preserve: boolean) => void;
  omitPrivate: boolean;
  setOmitPrivate: (omit: boolean) => void;
  type: string;
  mode: string;
  start: number;
  amount: number;
  pageLimit: number;
}

export const SearchOptions: React.FC<SearchOptionsProps> = ({
  quick,
  setQuick,
  preserveResults,
  setPreserveResults,
  omitPrivate,
  setOmitPrivate,
  type,
  mode,
  start,
  amount,
  pageLimit,
}) => {
  const showOmitPrivate = type === 'favourite' || (mode !== 'user' && mode !== 'newest');

  return (
    <div>
      <div className="button-columns-3" style={{ margin: '12px 0' }}>
        <div>
          <input
            type="checkbox"
            id="quick"
            checked={quick}
            onChange={() => setQuick(!quick)}
            disabled={true}
          />
          <label
            htmlFor="quick"
            className="checkbox-button"
            data-tooltip-id="quick"
            onClick={() =>
              alert(
                'For the moment, Quick Search is always enabled to prevent fucking up and crashing ThisVid :p',
              )
            }
          >
            Quick Search
          </label>
          <Tooltip id="quick" className="label-tooltip" place="top-start">
            When enabled, videos will only be filtered using the video title. When disabled,
            videos will be filtered by their actual tags. Currently, to prevent ThisVid
            crashing and to make the search much faster, it's always enabled.
          </Tooltip>
        </div>
        <div>
          <input
            type="checkbox"
            id="preserve-results"
            checked={preserveResults}
            onChange={() => setPreserveResults(!preserveResults)}
          />
          <label htmlFor="preserve-results" className="checkbox-button">
            Preserve Results
          </label>
        </div>
        {showOmitPrivate && (
          <div>
            <input
              type="checkbox"
              id="omit-private"
              checked={omitPrivate}
              onChange={() => setOmitPrivate(!omitPrivate)}
            />
            <label htmlFor="omit-private" className="checkbox-button">
              No Private Videos
            </label>
          </div>
        )}
      </div>
      <div className="button-columns">
        <button type="submit" name="run">
          Run
        </button>
        <button
          type="submit"
          name="next"
          disabled={start + amount > pageLimit && pageLimit !== 0}
        >
          Next
        </button>
      </div>
    </div>
  );
};
