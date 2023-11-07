import React, { useEffect } from 'react';
import { Tooltip } from 'react-tooltip';

import './style.css';

const InputTags = ({ tags, setTags, htmlId = 'tags', tooltip = null }) => {
  const [input, setInput] = React.useState('');
  const [open, setOpen] = React.useState(false);

  useEffect(() => {
    if (tags.length > 0) {
      setOpen(true);
    }
  }, [tags]);

  /**
   * @type {HTMLInputElement|null}
   */
  let tagInput = null;

  const removeTag = (i) => {
    const newTags = [...tags];
    newTags.splice(i, 1);
    setTags(newTags);
  };

  const addTag = (val) => {
    if (tags.find((tag) => tag.toLowerCase() === val.toLowerCase())) {
      return;
    }
    setTags([...tags, val]);
    tagInput.value = null;
    setInput('');
  };

  const inputKeyDown = (e) => {
    const val = e.target.value;
    if ((e.key === 'Enter' || e.key === ',') && val) {
      e.preventDefault();

      addTag(val);
    } else if (e.key === 'Backspace' && !val) {
      removeTag(tags.length - 1);
    }
  };

  return open ? (
    <ul className="input-tag__tags">
      {tags.map((tag, i) => (
        <li
          className="input-tag__tags__item"
          key={tag}
          onClick={() => {
            removeTag(i);
          }}
        >
          {tag}
        </li>
      ))}
      <li className="input-tag__tags__input">
        <input
          type="text"
          id={htmlId}
          onKeyDown={inputKeyDown}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add tag..."
          ref={(c) => {
            tagInput = c;
          }}
          data-tooltip-id={`${htmlId}-tooltip`}
        />
        <Tooltip id={`${htmlId}-tooltip`} className="label-tooltip" place="left-start">
          {tooltip}
        </Tooltip>
        {input && (
          <div
            className="input-tag__tooltip"
            onClick={(e) => {
              addTag(input);
            }}
          >
            Add <b>{input}</b> ⏎
          </div>
        )}
      </li>
    </ul>
  ) : (
    <button className="input-tag__button" onClick={() => setOpen(true)}>
      Add tags
    </button>
  );
};

export default InputTags;
