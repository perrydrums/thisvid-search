import React from 'react';

import './style.css';

type FriendResultProps = {
  uid: string;
  username: string;
  avatar: string;
  selectFunction: (uid: string) => void;
};

const FriendResult = ({ uid, username, avatar, selectFunction }: FriendResultProps) => (
  <div className="result" onClick={() => selectFunction(uid)} style={{ cursor: 'pointer' }}>
    <div>
      {avatar && <div className="thumbnail" style={{ backgroundImage: `url(${avatar})` }} />}
      <div className="details">{username}</div>
    </div>
  </div>
);

export default FriendResult;
