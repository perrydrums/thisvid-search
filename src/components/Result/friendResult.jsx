import React from 'react';
import './style.css';

const FriendResult = ({uid, username, avatar, selectFunction}) => (
  <div
    className="result"
    onClick={() => selectFunction(uid)}
  >
    {avatar &&
      <div className="thumbnail">
        <img src={avatar} alt={username}/>
      </div>
    }
    <div className="details">
      {username}
    </div>
  </div>
);

export default FriendResult;
