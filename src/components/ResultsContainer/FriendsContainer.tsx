import React from 'react';
import { LazyLoadComponent } from 'react-lazy-load-image-component';

import FriendResult from '../Result/friendResult';

type FriendsContainerProps = {
  friends: any[];
  filterUsername: string;
  setFriendId: (uid: string) => void;
};

const FriendsContainer = ({
  friends = [],
  filterUsername = '',
  setFriendId,
}: FriendsContainerProps) => {
  return (
    <div className="results-scroll-container">
      <div className="results">
        {friends
          .filter(({ username }) => username.toLowerCase().includes(filterUsername.toLowerCase()))
          .map(({ uid, username, avatar }) => (
            // @ts-ignore
            <LazyLoadComponent height={100} key={uid}>
              <FriendResult
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
