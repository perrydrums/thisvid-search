import React from 'react';
import { LazyLoadComponent } from 'react-lazy-load-image-component';

import CategoryResult from '../Result/categoryResult';

type CategoriesContainerProps = {
  categories: any[];
  setCategory: (slug: string) => void;
};

const CategoriesContainer = ({ categories = [], setCategory }: CategoriesContainerProps) => {
  return (
    <div className="results-scroll-container">
      <div className="results">
        {categories.map(({ name, image, slug }) => {
          return (
            // @ts-ignore
            <LazyLoadComponent height={100} key={slug}>
              <CategoryResult name={name} image={image} slug={slug} selectFunction={setCategory} />
            </LazyLoadComponent>
          );
        })}
      </div>
    </div>
  );
};

export default CategoriesContainer;
