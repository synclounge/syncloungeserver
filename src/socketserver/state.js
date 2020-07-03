import { getNumberFromUsername, guid } from './utils';

const rooms = new Map();
// Map from socket id to room name
const socketRoomId = new Map();

export const getUserRoomId = (socketId) => socketRoomId.get(socketId);

const getInternalUserRoomData = (socketId) => rooms.get(getUserRoomId(socketId))
  .users.get(socketId);

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

export const updatePlayerState = ({ socketId, state, time }) => {
  const userRoomData = getInternalUserRoomData(socketId);
  userRoomData.state = state;
  userRoomData.time = time;
  userRoomData.updatedAt = Date.now();
};

export const updateUserMedia = ({
  socketId, state, time, media,
}) => {
  const userRoomData = getInternalUserRoomData(socketId);
  userRoomData.media = media;
  updatePlayerState({ socketId, state, time });
};

export const addUserToRoom = ({
  socketId, roomId, desiredUsername, thumb,
}) => {
  const { users } = rooms.get(roomId);

  users.set(socketId, {
    username: getUniqueUsername({ users, desiredUsername }),
    thumb,
    isHost: users.size <= 0,
  });
};

export const isRoomPasswordCorrect = ({ roomId, roomPassword }) => roomPassword
  === rooms.get(roomId).password;

const getNewRoomId = () => {
  let name = guid();

  while (rooms.has(name)) {
    name = guid();
  }

  return name;
};

export const createRoom = ({ password, isPartyPausingEnabled }) => {
  const id = getNewRoomId();
  rooms.set(id, {
    password,
    isPartyPausingEnabled,
    users: new Map(),
  });

  return id;
};

export const isUserInARoom = (socketId) => socketRoomId.has(socketId);

export const doesRoomExist = (roomId) => rooms.has(roomId);

export const getRoomSocketIds = (roomId) => [...rooms.get(roomId).users.keys()];

const formatUserData = ({ id, timelineReceivedAt, ...rest }) => ({
  ...rest,
  serverTimelineAge: Date.now() - timelineReceivedAt,
  id,
});

export const getRoomUserData = (socketId) => formatUserData({
  id: socketId,
  ...getInternalUserRoomData(socketId),
});

const getOtherUserData = ({ roomId, exceptSocketId }) => [...rooms.get(roomId).users]
  .filter(([socketId]) => socketId !== exceptSocketId)
  .map(([id, data]) => formatUserData({ id, ...data }));

export const getJoinData = ({ roomId, socketId }) => {
  const { username, isHost } = getInternalUserRoomData(socketId);

  return {
    isPartyPausingEnabled: rooms.get(roomId).isPartyPausingEnabled,
    user: {
      id: socketId,
      username,
      isHost,
    },
    users: getOtherUserData({ roomId, exceptSocketId: socketId }),
  };
};

const updateUserRtt = ({ socketId, rtt }) => {
  // TODO: do this ugh
};

export const removeUser = (socketId) => {
  rooms.delete(socketRoomId.get(socketId));
  socketRoomId.delete(socketId);
};

export const removeRoom = (roomId) => {
  rooms.delete(roomId);
};

export const isUserHost = (socketId) => getInternalUserRoomData(socketId).isHost;

export const isRoomEmpty = (roomId) => rooms.get(roomId).users <= 0;

export const getAnySocketIdInRoom = (roomId) => rooms.get(roomId).users.keys().next().value;

export const makeUserHost = ({ roomId, socketId }) => {
  rooms.get(roomId).users.get(socketId).isHost = true;
};

export const removeUserHost = (socketId) => {
  getInternalUserRoomData(socketId).isHost = false;
};

export const isUserInRoom = ({ roomId, socketId }) => rooms.get(roomId).users.has(socketId);
