import React from 'react';

import '../App.css';

const Home = () => {
  return (
    <div className="home">
      <h1 className="subtitle">ThisVid Advanced Search Site</h1>
      <div className="home-buttons">
        <button onClick={() => (window.location.href = '/search')}>Search</button>
        <button onClick={() => (window.location.href = '/moods')}>Preferences</button>
      </div>
    </div>
  );
};

export default Home;
