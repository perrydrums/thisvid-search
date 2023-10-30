import React from 'react';
import './style.css';

const FriendResult = ({ uid, username, avatar, selectFunction }) => (
  <div className="result" onClick={() => selectFunction(uid)} style={{ cursor: 'pointer' }}>
    <div>
      {avatar && <div className="thumbnail" style={{ backgroundImage: `url(${avatar})` }} />}
      <div className="details">{username}</div>
    </div>
  </div>
);

export default FriendResult;
