import { v4 as uuidv4 } from 'uuid';

const rooms = new Map();
// Map from socket id to room name
const socketRoomId = new Map();
const socketLatencyData = new Map();

const getNumberFromUsername = (username) => parseInt(username.match(/\((\d+)\)$/)[1], 10);

export const getUserRoomId = (socketId) => socketRoomId.get(socketId);

export const getUserRoom = (socketId) => rooms.get(getUserRoomId(socketId));

export const getRoomUserData = (socketId) => getUserRoom(socketId)
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

export const getSocketLatency = (socketId) => socketLatencyData.get(socketId).rtt / 2;

export const updateUserPlayerState = ({
  socketId, state, time, duration, playbackRate,
}) => {
  const userRoomData = getRoomUserData(socketId);
  userRoomData.state = state;
  // Adjust time by sender's latency
  userRoomData.time = state === 'playing'
    ? time + getSocketLatency(socketId)
    : time;
  userRoomData.duration = duration;
  userRoomData.playbackRate = playbackRate;
  userRoomData.updatedAt = Date.now();
};

export const updateUserMedia = ({
  socketId, media,
}) => {
  const userRoomData = getRoomUserData(socketId);
  userRoomData.media = media;
};

export const updateUserSyncFlexibility = ({
  socketId, syncFlexibility,
}) => {
  const userRoomData = getRoomUserData(socketId);
  userRoomData.syncFlexibility = syncFlexibility;
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
  });
};

export const isRoomPasswordCorrect = ({ roomId, password }) => password
  === rooms.get(roomId).password;

export const createRoom = ({
  id, password, isPartyPausingEnabled, isAutoHostEnabled, hostId,
}) => {
  rooms.set(id, {
    password,
    isPartyPausingEnabled,
    isAutoHostEnabled,
    hostId,
    users: new Map(),
  });
};

export const isUserInARoom = (socketId) => socketRoomId.has(socketId);

export const doesRoomExist = (roomId) => rooms.has(roomId);

export const getRoomSocketIds = (roomId) => [...rooms.get(roomId).users.keys()];

export const formatUserData = ({
  recipientId, updatedAt, playbackRate, state, time, ...rest
}) => ({
  ...rest,
  playbackRate,
  state,
  // Adjust time by age if playing
  time: state === 'playing'
    ? time + (getSocketLatency(recipientId) + Date.now() - updatedAt) * playbackRate
    : time,
});

const getOtherUserData = ({ roomId, exceptSocketId }) => Object.fromEntries(
  [...rooms.get(roomId).users]
    .filter(([socketId]) => socketId !== exceptSocketId)
    .map(([id, data]) => ([id, formatUserData({ recipientId: exceptSocketId, ...data })])),
);

export const getRoomHostId = (roomId) => rooms.get(roomId).hostId;

export const getJoinData = ({ roomId, socketId }) => {
  const { username } = getRoomUserData(socketId);
  const { isPartyPausingEnabled, isAutoHostEnabled } = rooms.get(roomId);

  return {
    isPartyPausingEnabled,
    isAutoHostEnabled,
    hostId: getRoomHostId(roomId),
    user: {
      id: socketId,
      username,
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

export const isUserHost = (socketId) => getUserRoom(socketId).hostId === socketId;

export const isRoomEmpty = (roomId) => rooms.get(roomId).users.size <= 0;

export const getAnySocketIdInRoom = (roomId) => rooms.get(roomId).users.keys().next().value;

export const makeUserHost = (socketId) => {
  getUserRoom(socketId).hostId = socketId;
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
  const secret = uuidv4();
  const latencyData = socketLatencyData.get(socketId);
  latencyData.secret = secret;
  latencyData.sentAt = Date.now();
  return secret;
};

export const setSocketLatencyIntervalId = ({ socketId, intervalId }) => {
  socketLatencyData.get(socketId).intervalId = intervalId;
};

export const doesSocketHaveRtt = (socketId) => socketLatencyData.get(socketId).rtt != null;

export const initSocketLatencyData = (socketId) => {
  socketLatencyData.set(socketId, {});
};

export const removeSocketLatencyData = (socketId) => {
  socketLatencyData.delete(socketId);
};

export const setIsPartyPausingEnabledInSocketRoom = ({ socketId, isPartyPausingEnabled }) => {
  getUserRoom(socketId).isPartyPausingEnabled = isPartyPausingEnabled;
};

export const setIsAutoHostEnabledInSocketRoom = ({ socketId, isAutoHostEnabled }) => {
  getUserRoom(socketId).isAutoHostEnabled = isAutoHostEnabled;
};

export const isPartyPausingEnabledInSocketRoom = (socketId) => getUserRoom(socketId)
  .isPartyPausingEnabled;

export const isAutoHostEnabledInSocketRoom = (socketId) => getUserRoom(socketId)
  .isAutoHostEnabled;

export const clearSocketLatencyInterval = (socketId) => {
  clearInterval(socketLatencyData.get(socketId).intervalId);
};

const getLoad = () => {
  if (socketRoomId.size < 25) {
    return 'low';
  }

  if (socketRoomId.size < 50) {
    return 'medium';
  }

  return 'high';
};

export const getHealth = () => ({
  load: getLoad(),
});
