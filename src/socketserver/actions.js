import {
  isUserInARoom, getRoomUserData, getUserRoomId, makeUserHost,
  getRoomSocketIds, removeUser, isRoomEmpty, removeRoom, getAnySocketIdInRoom,
  generateAndSetSocketLatencySecret, formatUserData, getRoomHostId,
} from './state';

export const log = ({ socketId, message }) => {
  const identifier = isUserInARoom(socketId)
    ? `[${socketId}] ${getRoomUserData(socketId).username}`
    : `[${socketId}]`;

  console.log(new Date().toISOString(), identifier, ':', message);
};

export const emitToSocket = ({
  server, socketId, eventName, data,
}) => {
  // console.log(data);
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
    removeRoom(roomId);
    return;
  }

  if (getRoomHostId(roomId) === socketId) {
    // Make someone else host
    const desiredHostId = getAnySocketIdInRoom(roomId);
    makeUserHost(desiredHostId);

    log({
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

    return;
  }

  emitToRoom({
    server,
    roomId,
    eventName: 'userLeft',
    data: {
      id: socketId,
    },
  });
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
