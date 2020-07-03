import { getNumberFromUsername } from './utils';

const rooms = new Map();

// Map from socket id to room name
const socketRoomName = new Map();

const getUniqueUsername = ({ users, desiredUsername }) => {
  if (!users.has(desiredUsername)) {
    return desiredUsername;
  }

  // Get users with same username that are numbered like:  username(1)
  const sameUsersNum = [...users.keys()].filter((username) => username.startsWith(`${desiredUsername}(`));
  if (sameUsersNum.length > 0) {
    const userNumbers = sameUsersNum.map((user) => getNumberFromUsername(user.username));
    const nextNumber = Math.max(...userNumbers) + 1;

    return `${desiredUsername}(${nextNumber})`;
  }

  return `${desiredUsername}(1)`;
};

const updateUserTimeline = ({ socketId, timeline, plexClientLatency }) => {
  const userRoomData = rooms.get(socketRoomName.get(socketId)).users.get(socketId);
  userRoomData.timeline = timeline;
  userRoomData.plexClientLatency = plexClientLatency;
  userRoomData.timelineReceivedAt = Date.now();
};

export const addUserToRoom = ({
  socketId, roomName, desiredUsername, thumb, timeline, plexClientLatency,
}) => {
  const { users } = rooms.get(roomName);

  users.set(socketId, {
    username: getUniqueUsername({ users, desiredUsername }),
    thumb,
    isHost: users.size <= 0,
  });

  updateUserTimeline({
    socketId,
    timeline,
    plexClientLatency,
  });
};

export const isRoomPasswordCorrect = ({ roomName, roomPassword }) => roomPassword
  === rooms.get(roomName).password;

export const createRoom = ({ roomName, roomPassword, isPartyPausingEnabled }) => {
  rooms.set(roomName, {
    password: roomPassword,
    isPartyPausingEnabled,
    users: new Map(),
  });
};

export const isUserInARoom = (socketId) => socketRoomName.has(socketId);

export const doesRoomExist = (roomName) => rooms.has(roomName);

export const getRoomSocketIds = (roomName) => [...rooms.get(roomName).users.keys()];

const formatUserData = ({ id, timelineReceivedAt, ...rest }) => ({
  ...rest,
  serverTimelineAge: Date.now() - timelineReceivedAt,
  id,
});

export const getRoomUserData = ({ roomName, socketId }) => formatUserData({
  id: socketId,
  ...rooms.get(roomName).users.get(socketId),
});

const getOtherUserData = ({ roomName, exceptSocketId }) => [...rooms.get(roomName).users]
  .filter(([socketId]) => socketId !== exceptSocketId)
  .map(([id, data]) => formatUserData({ id, ...data }));

export const getJoinData = ({ roomName, socketId }) => {
  const { username, isHost } = rooms.get(roomName).users.get(socketId);

  return {
    isPartyPausingEnabled: rooms.get(roomName).isPartyPausingEnabled,
    user: {
      id: socketId,
      username,
      isHost,
    },
    users: getOtherUserData({ roomName, exceptSocketId: socketId }),
  };
};

export const updateUserRtt = ({ socketId, rtt }) => {
  // TODO: do this ugh
};

export const removeUser = (socketId) => {
  rooms.delete(socketRoomName.get(socketId));
  socketRoomName.delete(socketId);
};

export const removeRoom = (roomName) => {
  rooms.delete(roomName);
};

export const isUserHost = (socketId) => rooms.get(socketRoomName.get(socketId))
  .users.get(socketId).isHost;

export const getUserRoomName = (socketId) => socketRoomName.get(socketId);

export const isRoomEmpty = (roomName) => rooms.get(roomName).users <= 0;

export const getAnySocketIdInRoom = (roomName) => rooms.get(roomName).users.keys().next().value;

export const makeUserHost = ({ roomName, socketId }) => {
  rooms.get(roomName).users.get(socketId).isHost = true;
};

export const removeUserHost = (socketId) => {
  rooms.get(getUserRoomName(socketId)).users.get(socketId).isHost = false;
};

export const isUserInRoom = ({ roomName, socketId }) => rooms.get(roomName).users.has(socketId);
