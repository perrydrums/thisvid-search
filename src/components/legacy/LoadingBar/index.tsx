import React from 'react';

import './LoadingBar.css';

type LoadingBarProps = {
  loading: boolean;
};

const LoadingBar = ({ loading }: LoadingBarProps) => {
  if (!loading) return null;

  return (
    <div className="loading-bar-container">
      <div className="loading-bar" />
    </div>
  );
};

export default LoadingBar;
