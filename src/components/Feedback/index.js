import React, { useState } from 'react';

import { logFeedback } from '../../helpers/supabase/feedback';
import './style.css';

const Feedback = ({ search: { id }, resultCount }) => {
  const [showStars, setShowStars] = useState(false);
  const [hoveringOnStar, setHoveringOnStar] = useState(0);
  const [rating, setRating] = useState(0);

  const handleStarClick = (value) => {
    setRating(value);
    logFeedback(id, value);
  };

  const stars = [1, 2, 3, 4, 5];

  return (
    <div>
      {rating > 0 ? (
        <span className="feedback-confirmation">Thank you for your feedback!</span>
      ) : showStars ? (
        <div className="star-rating">
          {stars.map((star) => (
            <span
              key={star}
              className={star <= hoveringOnStar ? 'star selected' : 'star'}
              onMouseEnter={setHoveringOnStar.bind(null, star)}
              onMouseLeave={setHoveringOnStar.bind(null, 0)}
              onClick={() => handleStarClick(star)}
            >
              &#9733;
            </span>
          ))}
        </div>
      ) : (
        <span className="feedback-cta" onClick={() => setShowStars(true)}>
          &#9733; Rate the results &#9733;
        </span>
      )}
    </div>
  );
};

export default Feedback;
