import React from 'react';

import './style.css';

const CategoryResult = ({ name, image, slug, selectFunction }) => (
  <div className="result" onClick={() => selectFunction(slug)} style={{ cursor: 'pointer' }}>
    <div>
      {image && <div className="thumbnail" style={{ backgroundImage: `url(${image})` }} />}
      <div className="details">{name}</div>
    </div>
  </div>
);

export default CategoryResult;
