import React, { useEffect } from 'react';
import { Tooltip } from 'react-tooltip';

import './style.css';

type InputTagsProps = {
  tags: string[];
  setTags: (tags: string[]) => void;
  tooltip?: string;
  htmlId?: string;
};

const InputTags = ({ tags, setTags, tooltip, htmlId = 'tags' }: InputTagsProps) => {
  const [input, setInput] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [remove, setRemove] = React.useState(false);

  useEffect(() => {
    if (tags.length > 0) {
      setOpen(true);
    }
  }, [tags]);

  let tagInput: HTMLInputElement | null = null;

  const removeTag = (i: number) => {
    const newTags = [...tags];
    newTags.splice(i, 1);
    setTags(newTags);
  };

  const addTag = (val: string) => {
    if (tags.find((tag) => tag.toLowerCase() === val.toLowerCase())) {
      return;
    }
    setTags([...tags, val]);
    if (tagInput) {
      tagInput.value = '';
    }
    setInput('');
  };

  const inputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const target = e.target;
    const val = (target as HTMLInputElement).value;
    if ((e.key === 'Enter' || e.key === ',') && val) {
      e.preventDefault();

      addTag(val);
    } else if (e.key === 'Backspace' && !val) {
      if (remove) {
        removeTag(tags.length - 1);
        setRemove(false);
      } else {
        setRemove(true);
      }
    }
  };

  return open ? (
    <ul className="input-tag__tags">
      {tags.map((tag, i) => (
        <li
          className="input-tag__tags__item"
          key={tag}
          style={remove && i === tags.length - 1 ? { opacity: 0.5 } : {}}
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
