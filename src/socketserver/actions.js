import {
  isUserInARoom, getRoomUserData, getUserRoomId, makeUserHost, getSocketCount, getRoomSize,
  getRoomSocketIds, removeUser, isRoomEmpty, removeRoom, getAnySocketIdInRoom, getRoomCount,
  generateAndSetSocketLatencySecret, formatUserData, getRoomHostId, getJoinedUserCount,
} from './state';

export const log = (...args) => {
  console.log(new Date().toISOString(), ...args);
};

export const logSocket = ({ socketId, message }) => {
  const identifier = isUserInARoom(socketId)
    ? `[${socketId}] ${getRoomUserData(socketId).username}`
    : `[${socketId}]`;

  log(identifier, ':', message);
};

export const logSocketStats = () => {
  log('Connected:', getSocketCount(), '|', 'Joined:', getJoinedUserCount());
};

export const logRoomStats = (roomId) => {
  log('Room:', roomId, '|', 'Users:', getRoomSize(roomId));
};

export const logRoomsStats = () => {
  log('Rooms:', getRoomCount());
};

export const emitToSocket = ({
  server, socketId, eventName, data,
}) => {
  server.to(socketId).emit(eventName, data);
};

export const emitToUserRoomExcept = ({
  server, eventName, data, exceptSocketId,
}) => {
  getRoomSocketIds(getUserRoomId(exceptSocketId))
    .filter((socketId) => socketId !== exceptSocketId)
    .forEach((socketId) => {
      emitToSocket({
        server, socketId, eventName, data,
      });
    });
};

const emitToRoom = ({
  server, roomId, eventName, data,
}) => {
  getRoomSocketIds(roomId).forEach((socketId) => {
    emitToSocket({
      server, socketId, eventName, data,
    });
  });
};

export const emitToSocketRoom = ({
  server, socketId, eventName, data,
}) => {
  emitToRoom({
    server, roomId: getUserRoomId(socketId), eventName, data,
  });
};

export const announceNewHost = ({ server, roomId, hostId }) => {
  emitToRoom({
    server,
    roomId,
    eventName: 'newHost',
    data: hostId,
  });
};

export const removeUserAndUpdateRoom = ({ server, socketId }) => {
  const roomId = getUserRoomId(socketId);

  removeUser(socketId);

  if (isRoomEmpty(roomId)) {
    log('Removing room:', roomId);

    removeRoom(roomId);
    logRoomsStats();
    return null;
  }

  if (getRoomHostId(roomId) === socketId) {
    // Make someone else host
    const desiredHostId = getAnySocketIdInRoom(roomId);
    makeUserHost(desiredHostId);

    logSocket({
      socketId,
      message: `Transferring host to: [${desiredHostId}] ${getRoomUserData(desiredHostId).username}`,
    });
    emitToRoom({
      server,
      roomId,
      eventName: 'userLeft',
      data: {
        id: socketId,
        newHostId: desiredHostId,
      },
    });
  } else {
    emitToRoom({
      server,
      roomId,
      eventName: 'userLeft',
      data: {
        id: socketId,
      },
    });
  }

  return roomId;
};

export const sendPing = ({ server, socketId }) => {
  const secret = generateAndSetSocketLatencySecret(socketId);

  emitToSocket({
    server,
    socketId,
    eventName: 'slPing',
    data: secret,
  });
};

// Used to emit both player state updates and media updates.
// Adjusts the time by the latency to the recipient
export const emitAdjustedUserDataToRoom = ({
  server, eventName, exceptSocketId, userData,
}) => {
  getRoomSocketIds(getUserRoomId(exceptSocketId))
    .filter((socketId) => socketId !== exceptSocketId)
    .forEach((socketId) => {
      emitToSocket({
        server,
        socketId,
        eventName,
        data: {
          ...formatUserData({
            ...userData,
            recipientId: socketId,
          }),
          id: exceptSocketId,
        },
      });
    });
};

export const emitPlayerStateUpdateToRoom = ({ server, socketId }) => {
  const {
    updatedAt, state, time, duration, playbackRate,
  } = getRoomUserData(socketId);

  emitAdjustedUserDataToRoom({
    server,
    eventName: 'playerStateUpdate',
    exceptSocketId: socketId,
    userData: {
      updatedAt,
      state,
      time,
      duration,
      playbackRate,
    },
  });
};

export const emitMediaUpdateToRoom = ({ server, socketId, makeHost }) => {
  const {
    updatedAt, state, time, duration, playbackRate, media,
  } = getRoomUserData(socketId);

  emitAdjustedUserDataToRoom({
    server,
    eventName: 'mediaUpdate',
    exceptSocketId: socketId,
    userData: {
      updatedAt,
      state,
      time,
      duration,
      playbackRate,
      media,
      makeHost,
    },
  });
};
