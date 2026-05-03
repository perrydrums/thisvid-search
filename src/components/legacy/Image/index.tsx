import React from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';

type Props = {
  image: {
    src: string;
    alt: string;
    caption: string;
    width: number;
    height: number;
  };
};

const MyImage = ({ image }: Props) => (
  <div>
    <LazyLoadImage
      alt={image.alt}
      height={image.height}
      src={image.src} // use normal <img> attributes as props
      width={image.width}
    />
    <span>{image.caption}</span>
  </div>
);

export default MyImage;
