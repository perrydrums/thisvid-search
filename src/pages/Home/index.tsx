import React from 'react';

import '../../App.css';
import styles from './Home.module.css';

const Home = () => {
  return (
    <div className={styles.home}>
      <h1 className={styles.title}>ThisVid Advanced Search Site</h1>
      <div className={styles.buttons}>
        <button onClick={() => (window.location.href = '/search')}>Search</button>
        <button onClick={() => (window.location.href = '/preferences')}>Preferences</button>
      </div>
    </div>
  );
};

export default Home;
