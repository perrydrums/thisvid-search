import React from 'react';
import { LazyLoadComponent } from 'react-lazy-load-image-component';

import CategoryResult from '../Result/categoryResult';

const CategoriesContainer = ({ categories = [], setCategory }) => {
  return (
    <div className="results-scroll-container">
      <div className="results">
        {categories.map(({ name, image, slug }) => {
          return (
            <LazyLoadComponent height={100}>
              <CategoryResult
                key={slug}
                name={name}
                image={image}
                slug={slug}
                selectFunction={setCategory}
              />
            </LazyLoadComponent>
          );
        })}
      </div>
    </div>
  );
};

export default CategoriesContainer;
