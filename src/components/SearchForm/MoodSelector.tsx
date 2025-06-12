import React from 'react';
import { Tooltip } from 'react-tooltip';
import { Mood } from '../../helpers/types';

interface MoodSelectorProps {
  activeMood: string;
  setActiveMood: (mood: string) => void;
  moods: Mood[];
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({
  activeMood,
  setActiveMood,
  moods
}) => {
  return (
    <>
      <label htmlFor="mood">
        Mood{' '}
        <a className="username" href="/preferences">
          Manage moods
        </a>
      </label>
      <div>
        <div className="select-wrapper">
          <select
            id="mood"
            value={activeMood}
            onChange={(e) => setActiveMood(e.target.value)}
            data-tooltip-id="mood"
          >
            {moods.map((mood) => (
              <option key={mood.name} value={mood.name}>
                {mood.name}
              </option>
            ))}
          </select>
        </div>

        <Tooltip id="mood" className="label-tooltip" place="left-start">
          Prefill the search options.
        </Tooltip>
      </div>
    </>
  );
};
