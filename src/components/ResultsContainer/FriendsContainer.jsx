import React from 'react';
import { LazyLoadComponent } from 'react-lazy-load-image-component';

import FriendResult from '../Result/friendResult';

const FriendsContainer = ({ friends = [], filterUsername = '', setFriendId }) => {
  return (
    <div className="results-scroll-container">
      <div className="results">
        {friends
          .filter(({ username }) => username.toLowerCase().includes(filterUsername.toLowerCase()))
          .map(({ uid, username, avatar }) => (
            <LazyLoadComponent height={100}>
              <FriendResult
                key={uid}
                uid={uid}
                username={username}
                avatar={avatar}
                selectFunction={() => setFriendId(uid)}
              />
            </LazyLoadComponent>
          ))}
      </div>
    </div>
  );
};

export default FriendsContainer;
