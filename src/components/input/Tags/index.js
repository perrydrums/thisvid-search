import React from 'react';
import './style.css';

const InputTags = ({ tags, setTags }) => {
  const [input, setInput] = React.useState('');

  /**
   * @type {HTMLInputElement|null}
   */
  let tagInput = null;

  const removeTag = (i) => {
    const newTags = [...tags];
    newTags.splice(i, 1);
    setTags(newTags);
  };

  const inputKeyDown = (e) => {
    const val = e.target.value;
    if ((e.key === 'Enter' || e.key === ',') && val) {
      e.preventDefault();

      if (tags.find((tag) => tag.toLowerCase() === val.toLowerCase())) {
        return;
      }
      setTags([...tags, val]);
      tagInput.value = null;
      setInput('');
    } else if (e.key === 'Backspace' && !val) {
      removeTag(tags.length - 1);
    }
  };

  return (
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
          onKeyDown={inputKeyDown}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          ref={(c) => {
            tagInput = c;
          }}
        />
        {input && (
          <div className="input-tag__tooltip">
            Add <b>{input}</b> ⏎
          </div>
        )}
      </li>
    </ul>
  );
};

export default InputTags;
