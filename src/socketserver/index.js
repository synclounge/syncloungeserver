import io from 'socket.io';

import config from '../config';
import {
  doesRoomExist, isUserInARoom, getRoomUserData, isUserHost, removeSocketLatencyData,
  getJoinData, isRoomPasswordCorrect, createRoom, addUserToRoom, clearSocketLatencyInterval,
  getUserRoomId, isUserInRoom, updateUserMedia, makeUserHost, updateUserPlayerState,
  getSocketPingSecret, updateSocketLatency, setSocketLatencyIntervalId, doesSocketHaveRtt,
  getRoomSocketIds, removeUser, isRoomEmpty, removeRoom, getAnySocketIdInRoom,
  generateAndSetSocketLatencySecret, initSocketLatencyData, formatUserData, getRoomHostId,
  setIsPartyPausingEnabledInSocketRoom, updateUserSyncFlexibility, setIsAutoHostEnabledInSocketRoom,
  isPartyPausingEnabledInSocketRoom, isAutoHostEnabledInSocketRoom,
} from './state';

const server = io({
  serveClient: false,
  cookie: false,
  // Use websockets first
  transports: ['websockets', 'polling'],
});

const log = ({ socketId, message }) => {
  const identifier = isUserInARoom(socketId)
    ? `[${socketId}] ${getRoomUserData(socketId).username}`
    : `[${socketId}]`;

  console.log(new Date().toISOString(), identifier, ':', message);
};

const emitToSocket = ({ socketId, eventName, data }) => {
  // console.log(data);
  server.to(socketId).emit(eventName, data);
};

const emitToUserRoomExcept = ({
  eventName, data, exceptSocketId,
}) => {
  getRoomSocketIds(getUserRoomId(exceptSocketId))
    .filter((socketId) => socketId !== exceptSocketId)
    .forEach((socketId) => {
      emitToSocket({ socketId, eventName, data });
    });
};

const emitToRoom = ({ roomId, eventName, data }) => {
  getRoomSocketIds(roomId).forEach((socketId) => {
    emitToSocket({ socketId, eventName, data });
  });
};

const emitToSocketRoom = ({ socketId, eventName, data }) => {
  emitToRoom({ roomId: getUserRoomId(socketId), eventName, data });
};

const announceNewHost = ({ roomId, hostId }) => {
  emitToRoom({
    roomId,
    eventName: 'newHost',
    data: hostId,
  });
};

const removeUserAndUpdateRoom = (socketId) => {
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
    roomId,
    eventName: 'userLeft',
    data: {
      id: socketId,
    },
  });
};

const sendPing = (socketId) => {
  const secret = generateAndSetSocketLatencySecret(socketId);

  emitToSocket({
    socketId,
    eventName: 'slPing',
    data: secret,
  });
};

// Used to emit both player state updates and media updates.
// Adjusts the time by the latency to the recipient
const emitAdjustedUserDataToRoom = ({ eventName, exceptSocketId, userData }) => {
  getRoomSocketIds(getUserRoomId(exceptSocketId))
    .filter((socketId) => socketId !== exceptSocketId)
    .forEach((socketId) => {
      emitToSocket({
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

const join = ({
  socket, data: {
    roomId, password, desiredUsername, desiredPartyPausingEnabled, desiredAutoHostEnabled, thumb,
    playerProduct, state, time, duration, playbackRate, media, syncFlexibility,
  },
}) => {
  // TODO: validate timeline thign

  if (!doesSocketHaveRtt(socket.id)) {
    // Ignore join if we don't have rtt yet.
    // Client should never do this so this just exists for bad actors
    log({ socketId: socket.id, message: 'Socket tried to join without finishing initial ping/pong' });
    socket.disconnect(true);
    return;
  }

  if (isUserInARoom(socket.id)) {
    // TODO: remove listeners?
    removeUserAndUpdateRoom(socket.id);
  }

  const roomExists = doesRoomExist(roomId);

  if (roomExists) {
    if (!isRoomPasswordCorrect({ roomId, password })) {
      emitToSocket({
        socketId: socket.id,
        eventName: 'joinResult',
        data: {
          success: false,
          error: 'Password wrong',
        },
      });
      return;
    }
  } else {
    log({ socketId: socket.id, message: `Creating room: ${roomId}` });

    createRoom({
      id: roomId,
      password,
      isPartyPausingEnabled: desiredPartyPausingEnabled,
      isAutoHostEnabled: desiredAutoHostEnabled,
      hostId: socket.id,
    });
  }

  addUserToRoom({
    socketId: socket.id,
    roomId,
    desiredUsername,
    thumb,
    playerProduct,
  });

  log({ socketId: socket.id, message: `join "${roomId}"` });

  updateUserPlayerState({
    socketId: socket.id, state, time, duration, playbackRate,
  });

  updateUserSyncFlexibility({
    socketId: socket.id,
    syncFlexibility,
  });

  updateUserMedia({
    socketId: socket.id,
    media,
  });

  // Broadcast user joined to everyone but this
  emitAdjustedUserDataToRoom({
    exceptSocketId: socket.id,
    eventName: 'userJoined',
    userData: getRoomUserData(socket.id),
  });

  emitToSocket({
    socketId: socket.id,
    eventName: 'joinResult',
    data: {
      success: true,
      ...getJoinData({ roomId, socketId: socket.id }),
    },
  });
};

const disconnect = ({ socket }) => {
  log({ socketId: socket.id, message: 'disconnect' });

  if (isUserInARoom(socket.id)) {
    removeUserAndUpdateRoom(socket.id);
  }

  clearSocketLatencyInterval(socket.id);
  removeSocketLatencyData(socket.id);
};

const transferHost = ({ socket, data: desiredHostId }) => {
  if (!isUserInARoom(socket.id) || !isUserHost(socket.id)) {
    socket.disconnect(true);
    return;
  }

  const roomId = getUserRoomId(socket.id);
  if (!isUserInRoom({ roomId, socketId: desiredHostId })) {
    socket.disconnect(true);
    return;
  }

  log({
    socketId: socket.id,
    message: `Transferring host to: [${desiredHostId}] ${getRoomUserData(desiredHostId).username}`,
  });
  makeUserHost(desiredHostId);
  announceNewHost({
    roomId,
    hostId: desiredHostId,
  });
};

const emitPlayerStateUpdateToRoom = (socketId) => {
  const {
    updatedAt, state, time, duration, playbackRate,
  } = getRoomUserData(socketId);

  emitAdjustedUserDataToRoom({
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

const playerStateUpdate = ({
  socket, data: {
    state, time, duration, playbackRate,
  },
}) => {
  if (!isUserInARoom(socket.id)) {
    socket.disconnect(true);
    return;
  }

  updateUserPlayerState({
    socketId: socket.id, state, time, duration, playbackRate,
  });

  emitPlayerStateUpdateToRoom(socket.id);
};

const emitMediaUpdateToRoom = ({ socketId, makeHost }) => {
  const {
    updatedAt, state, time, duration, playbackRate, media,
  } = getRoomUserData(socketId);

  emitAdjustedUserDataToRoom({
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

const mediaUpdate = ({
  socket, data: {
    state, time, duration, playbackRate, media, userInitiated,
  },
}) => {
  if (!isUserInARoom(socket.id)) {
    socket.disconnect(true);
    return;
  }

  updateUserPlayerState({
    socketId: socket.id, state, time, duration, playbackRate,
  });

  updateUserMedia({
    socketId: socket.id,
    media,
  });

  const makeHost = userInitiated && !isUserHost(socket.id)
    && isAutoHostEnabledInSocketRoom(socket.id);

  if (makeHost) {
    // Emit to user that they are host now
    makeUserHost(socket.id);
    emitToSocket({
      socketId: socket.id,
      eventName: 'newHost',
      data: socket.id,
    });

    log({
      socketId: socket.id,
      message: 'Making host because user initiated media change',
    });
  }

  emitMediaUpdateToRoom({ socketId: socket.id, makeHost });
};

const slPong = ({ socket, data: secret }) => {
  const expectedSecret = getSocketPingSecret(socket.id);
  if (expectedSecret === null || secret !== expectedSecret) {
    log({
      socketId: socket.id,
      message: `Incorrect secret. Expected "${expectedSecret}", got "${secret}"`,
    });

    socket.disconnect(true);
    return;
  }

  updateSocketLatency(socket.id);

  setSocketLatencyIntervalId({
    socketId: socket.id,
    intervalId: setTimeout(() => {
      sendPing(socket.id);
    }, config.get('ping_interval')),
  });
};

const sendMessage = ({ socket, data: text }) => {
  if (!isUserInARoom(socket.id)) {
    socket.disconnect(true);
    return;
  }

  emitToUserRoomExcept({
    eventName: 'newMessage',
    data: {
      text,
      senderId: socket.id,
    },
    exceptSocketId: socket.id,
  });
};

const setPartyPausingEnabled = ({ socket, data: isPartyPausingEnabled }) => {
  if (!isUserInARoom(socket.id) || !isUserHost(socket.id)) {
    socket.disconnect(true);
    return;
  }

  log({
    socketId: socket.id,
    message: `set party pausing to: ${isPartyPausingEnabled}`,
  });

  setIsPartyPausingEnabledInSocketRoom({ socketId: socket.id, isPartyPausingEnabled });

  // Emitting to everyone including sender as an ack that it went through
  emitToSocketRoom({
    socketId: socket.id,
    eventName: 'setPartyPausingEnabled',
    data: isPartyPausingEnabled,
  });
};

const setAutoHostEnabled = ({ socket, data: isAutoHostEnabled }) => {
  if (!isUserInARoom(socket.id) || !isUserHost(socket.id)) {
    socket.disconnect(true);
    return;
  }

  log({
    socketId: socket.id,
    message: `set auto host to: ${isAutoHostEnabled}`,
  });

  setIsAutoHostEnabledInSocketRoom({ socketId: socket.id, isAutoHostEnabled });

  // Emitting to everyone including sender as an ack that it went through
  emitToSocketRoom({
    socketId: socket.id,
    eventName: 'setAutoHostEnabled',
    data: isAutoHostEnabled,
  });
};

const partyPause = ({ socket, data: isPause }) => {
  if (!isUserInARoom(socket.id) || !isPartyPausingEnabledInSocketRoom(socket.id)) {
    socket.disconnect(true);
    return;
  }

  emitToSocketRoom({
    socketId: socket.id,
    eventName: 'partyPause',
    data: {
      senderId: socket.id,
      isPause,
    },
  });
};

const syncFlexibilityUpdate = ({ socket, data: syncFlexibility }) => {
  if (!isUserInARoom(socket.id)) {
    socket.disconnect(true);
    return;
  }

  updateUserSyncFlexibility({
    socketId: socket.id,
    syncFlexibility,
  });

  emitToUserRoomExcept({
    eventName: 'syncFlexibilityUpdate',
    data: {
      syncFlexibility,
      id: socket.id,
    },
    exceptSocketId: socket.id,
  });
};

server.on('connection', (socket) => {
  log({ socketId: socket.id, message: `connection "${socket.conn.remoteAddress}"` });
  initSocketLatencyData(socket.id);
  sendPing(socket.id);

  const registerEvent = ({ eventName, handler }) => {
    socket.on(eventName, (data) => {
      handler({ socket, data });
    });
  };

  // Register handlers
  registerEvent({ eventName: 'join', handler: join });
  registerEvent({ eventName: 'slPong', handler: slPong });
  registerEvent({ eventName: 'playerStateUpdate', handler: playerStateUpdate });
  registerEvent({ eventName: 'mediaUpdate', handler: mediaUpdate });
  registerEvent({ eventName: 'syncFlexibilityUpdate', handler: syncFlexibilityUpdate });
  registerEvent({ eventName: 'transferHost', handler: transferHost });
  registerEvent({ eventName: 'sendMessage', handler: sendMessage });
  registerEvent({ eventName: 'setPartyPausingEnabled', handler: setPartyPausingEnabled });
  registerEvent({ eventName: 'setAutoHostEnabled', handler: setAutoHostEnabled });
  registerEvent({ eventName: 'partyPause', handler: partyPause });
  registerEvent({ eventName: 'disconnect', handler: disconnect });
});

export default server;
