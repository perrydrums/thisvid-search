import React from 'react';
import { Modes } from '../../helpers/types';

interface ModeSelectorProps {
  mode: string;
  setMode: (mode: string) => void;
  modes: Modes;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ mode, setMode, modes }) => {
  return (
    <>
      <label htmlFor="search-mode">Search by</label>
      <div className="select-wrapper">
        <select id="search-mode" value={mode} onChange={(e) => setMode(e.target.value)}>
          {Object.keys(modes).map((key) => (
            <option key={key} value={key}>
              {modes[key]}
            </option>
          ))}
        </select>
      </div>
    </>
  );
};
