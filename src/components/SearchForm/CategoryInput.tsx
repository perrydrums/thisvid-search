import React from 'react';
import { Category } from '../../helpers/types';

interface CategoryInputProps {
  mode: string;
  category: string;
  setCategory: (category: string) => void;
  categoryType: string;
  setCategoryType: (type: string) => void;
  categories: Category[];
  friendIdFieldHover: boolean;
  setFriendIdFieldHover: (hover: boolean) => void;
  primaryTag: string;
  setPrimaryTag: (tag: string) => void;
  sourceExists: boolean;
  checkSourceExists: () => void;
}

export const CategoryInput: React.FC<CategoryInputProps> = ({
  mode,
  category,
  setCategory,
  categoryType,
  setCategoryType,
  categories,
  friendIdFieldHover,
  setFriendIdFieldHover,
  primaryTag,
  setPrimaryTag,
  sourceExists,
  checkSourceExists,
}) => {
  if (mode === 'category') {
    return (
      <>
        <label htmlFor="category">Category</label>
        <div className="select-wrapper select-wrapper-alt">
          {!category && (
            <select
              id="category-type"
              value={categoryType}
              required
              onChange={(e) => setCategoryType(e.target.value)}
            >
              <option disabled value="">
                - Select -
              </option>
              <option value="straight">Straight</option>
              <option value="gay">Gay</option>
            </select>
          )}
          {category && (
            <input
              type="text"
              readOnly={true}
              required={true}
              id="category"
              placeholder="Choose category"
              value={categories.find((c) => c.slug === category)?.name || ''}
              onClick={() => setCategory('')}
              onMouseEnter={() => setFriendIdFieldHover(true)}
              onMouseLeave={() => setFriendIdFieldHover(false)}
              style={{ cursor: 'pointer' }}
            />
          )}
        </div>
      </>
    );
  }

  if (mode === 'tags') {
    return (
      <>
        <label htmlFor="primary-tag">
          Primary Tag {!sourceExists && 'Tag does not exist'}
        </label>
        <input
          type="text"
          id="primary-tag"
          value={primaryTag}
          required
          onChange={(e) => setPrimaryTag(e.target.value.toLowerCase())}
          onBlur={checkSourceExists}
        />
      </>
    );
  }

  if (mode === 'extreme') {
    return (
      <>
        <label htmlFor="primary-tag">Search</label>
        <input
          type="text"
          id="primary-tag"
          value={primaryTag}
          required
          onChange={(e) => setPrimaryTag(e.target.value.toLowerCase())}
          onBlur={checkSourceExists}
        />
      </>
    );
  }

  return null;
};
