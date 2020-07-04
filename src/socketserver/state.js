import { getNumberFromUsername, guid } from './utils';

const rooms = new Map();
// Map from socket id to room name
const socketRoomId = new Map();
const socketLatencyData = new Map();

export const getUserRoomId = (socketId) => socketRoomId.get(socketId);

const getInternalUserRoomData = (socketId) => rooms.get(getUserRoomId(socketId))
  .users.get(socketId);

const getUniqueUsername = ({ usernames, desiredUsername }) => {
  if (!usernames.includes(desiredUsername)) {
    return desiredUsername;
  }

  // Get users with same username that are numbered like:  username(1)
  const sameUsersNum = usernames.filter((username) => username.startsWith(`${desiredUsername}(`));
  if (sameUsersNum.length > 0) {
    const userNumbers = sameUsersNum.map(getNumberFromUsername);
    const nextNumber = Math.max(...userNumbers) + 1;

    return `${desiredUsername}(${nextNumber})`;
  }

  return `${desiredUsername}(1)`;
};

export const updatePlayerState = ({
  socketId, state, time, duration,
}) => {
  const userRoomData = getInternalUserRoomData(socketId);
  userRoomData.state = state;
  userRoomData.time = time;
  userRoomData.duration = duration;
  userRoomData.updatedAt = Date.now();
};

export const updateUserMedia = ({
  socketId, state, time, duration, media,
}) => {
  const userRoomData = getInternalUserRoomData(socketId);
  userRoomData.media = media;
  updatePlayerState({
    socketId, state, time, duration,
  });
};

export const addUserToRoom = ({
  socketId, roomId, desiredUsername, thumb, playerProduct,
}) => {
  const { users } = rooms.get(roomId);

  const usernames = [...users.values()].map((user) => user.username);

  socketRoomId.set(socketId, roomId);
  users.set(socketId, {
    username: getUniqueUsername({ usernames, desiredUsername }),
    thumb,
    playerProduct,
    isHost: users.size <= 0,
  });
};

export const isRoomPasswordCorrect = ({ roomId, password }) => password
  === rooms.get(roomId).password;

export const createRoom = ({ id, password, isPartyPausingEnabled }) => {
  rooms.set(id, {
    password,
    isPartyPausingEnabled,
    users: new Map(),
  });
};

export const isUserInARoom = (socketId) => socketRoomId.has(socketId);

export const doesRoomExist = (roomId) => rooms.has(roomId);

export const getRoomSocketIds = (roomId) => [...rooms.get(roomId).users.keys()];

const formatUserData = ({
  updatedAt, state, time, ...rest
}) => ({
  ...rest,
  state,
  // Adjust time by age if playing
  time: state === 'playing' ? time + Date.now() - updatedAt : time,
});

export const getRoomUserData = (socketId) => formatUserData({
  id: socketId,
  ...getInternalUserRoomData(socketId),
});

const getOtherUserData = ({ roomId, exceptSocketId }) => Object.fromEntries(
  [...rooms.get(roomId).users]
    .filter(([socketId]) => socketId !== exceptSocketId)
    .map(([id, data]) => ([id, formatUserData(data)])),
);

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

export const removeUser = (socketId) => {
  rooms.get(getUserRoomId(socketId)).users.delete(socketId);
  socketRoomId.delete(socketId);
};

export const removeRoom = (roomId) => {
  rooms.delete(roomId);
};

export const isUserHost = (socketId) => getInternalUserRoomData(socketId).isHost;

export const isRoomEmpty = (roomId) => rooms.get(roomId).users.size <= 0;

export const getAnySocketIdInRoom = (roomId) => rooms.get(roomId).users.keys().next().value;

export const makeUserHost = (socketId) => {
  getInternalUserRoomData(socketId).isHost = false;
};

export const removeUserHost = (socketId) => {
  getInternalUserRoomData(socketId).isHost = false;
};

export const isUserInRoom = ({ roomId, socketId }) => rooms.get(roomId).users.has(socketId);

export const getSocketPingSecret = (socketId) => socketLatencyData.get(socketId).secret;

export const updateSocketLatency = (socketId) => {
  const latencyData = socketLatencyData.get(socketId);

  // TODO: potentially smooth it? or also measure variance?
  latencyData.rtt = Date.now() - latencyData.sentAt;

  // Reset secret
  latencyData.secret = null;
};

export const generateAndSetSocketLatencySecret = (socketId) => {
  const secret = guid();
  socketLatencyData.get(socketId).secret = secret;
  return secret;
};

export const setSocketLatencyIntervalId = ({ socketId, intervalId }) => {
  socketLatencyData.get(socketId).intervalId = intervalId;
};

export const doesSocketHaveRtt = (socketId) => socketLatencyData.get(socketId).rtt != null;

export const initSocketLatencyData = (socketId) => socketLatencyData.set(socketId, {});
