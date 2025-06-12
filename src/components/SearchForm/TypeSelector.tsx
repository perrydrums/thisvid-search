import React from 'react';
import { Types } from '../../helpers/types';

interface TypeSelectorProps {
  mode: string;
  type: string;
  setType: (type: string) => void;
  types: Types;
}

export const TypeSelector: React.FC<TypeSelectorProps> = ({ mode, type, setType, types }) => {
  return (
    <>
      <label htmlFor="type">Type</label>
      <div className="select-wrapper">
        <select value={type} id="type" required onChange={(e) => setType(e.target.value)}>
          <option disabled value="">
            - Select -
          </option>
          {types[mode]?.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
};
