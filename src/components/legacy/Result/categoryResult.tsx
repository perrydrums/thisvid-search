import React from 'react';

import './style.css';

type CategoryResultProps = {
  name: string;
  image: string;
  slug: string;
  selectFunction: (slug: string) => void;
};

const CategoryResult = ({ name, image, slug, selectFunction }: CategoryResultProps) => (
  <div className="result" onClick={() => selectFunction(slug)} style={{ cursor: 'pointer' }}>
    <div>
      {image && <div className="thumbnail" style={{ backgroundImage: `url(${image})` }} />}
      <div className="details">{name}</div>
    </div>
  </div>
);

export default CategoryResult;
