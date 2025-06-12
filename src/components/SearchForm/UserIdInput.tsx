import React from 'react';
import { Tooltip } from 'react-tooltip';
import { Friend } from '../../helpers/types';

interface UserIdInputProps {
  mode: string;
  id: string;
  setId: (id: string) => void;
  username: string;
  friendId: string;
  setFriendId: (friendId: string | null) => void;
  friends: Friend[];
  friendIdFieldHover: boolean;
  setFriendIdFieldHover: (hover: boolean) => void;
  getFriendsById: () => void;
}

export const UserIdInput: React.FC<UserIdInputProps> = ({
  mode,
  id,
  setId,
  username,
  friendId,
  setFriendId,
  friends,
  friendIdFieldHover,
  setFriendIdFieldHover,
  getFriendsById,
}) => {
  if (mode !== 'user' && mode !== 'friend') {
    return null;
  }

  return (
    <>
      <div>
        <label htmlFor="id">{mode === 'friend' && 'Your '}User ID</label>
        {username && (
          <a
            href={`https://thisvid.com/members/${id}/`}
            target="_blank"
            rel="noreferrer"
            className="username"
          >
            {username}
          </a>
        )}
      </div>
      <input
        type="text"
        id="id"
        value={id}
        required
        onChange={(e) => setId(e.target.value)}
        data-tooltip-id="id"
      />
      <Tooltip id="id" className="label-tooltip" place="left-start">
        The ID of the ThisVid user profile. You can find this in the URL of the profile
        page on ThisVid.
      </Tooltip>

      {mode === 'friend' && (
        <>
          <div>
            <label htmlFor="friendId">
              <span>Choose Friend</span>
            </label>
            {friendId && (
              <a
                href={`https://thisvid.com/members/${friendId}/`}
                target="_blank"
                rel="noreferrer"
                className="username"
              >
                {friends.find((friend) => friend.uid === friendId)?.username}
              </a>
            )}
          </div>
          {friends.length === 0 ? (
            <button type="button" onClick={getFriendsById} disabled={id === ''}>
              Get Friends
            </button>
          ) : (
            <input
              type="text"
              readOnly={true}
              required={true}
              id="friendId"
              placeholder="Choose friend"
              value={friendIdFieldHover ? 'Change friend' : friendId || ''}
              onClick={() => setFriendId(null)}
              onMouseEnter={() => setFriendIdFieldHover(true)}
              onMouseLeave={() => setFriendIdFieldHover(false)}
              style={{ cursor: 'pointer' }}
            />
          )}
        </>
      )}
    </>
  );
};
