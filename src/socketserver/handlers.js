import {
  doesRoomExist, isUserInARoom, getRoomUserData, isUserHost, removeSocketLatencyData,
  getJoinData, isRoomPasswordCorrect, createRoom, addUserToRoom, clearSocketLatencyInterval,
  getUserRoomId, isUserInRoom, updateUserMedia, makeUserHost, updateUserPlayerState,
  getSocketPingSecret, updateSocketLatency, setSocketLatencyIntervalId, doesSocketHaveRtt,
  setIsPartyPausingEnabledInSocketRoom, updateUserSyncFlexibility, setIsAutoHostEnabledInSocketRoom,
  isPartyPausingEnabledInSocketRoom, isAutoHostEnabledInSocketRoom, initSocketLatencyData,
} from './state';

import {
  removeUserAndUpdateRoom, emitToSocket, log, emitAdjustedUserDataToRoom, announceNewHost,
  emitPlayerStateUpdateToRoom, emitMediaUpdateToRoom, sendPing, emitToSocketRoom,
  emitToUserRoomExcept,
} from './actions';

const join = ({
  server, socket, data: {
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
    removeUserAndUpdateRoom({ server, socketId: socket.id });
  }

  const roomExists = doesRoomExist(roomId);

  if (roomExists) {
    if (!isRoomPasswordCorrect({ roomId, password })) {
      emitToSocket({
        server,
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
    server,
    exceptSocketId: socket.id,
    eventName: 'userJoined',
    userData: getRoomUserData(socket.id),
  });

  emitToSocket({
    server,
    socketId: socket.id,
    eventName: 'joinResult',
    data: {
      success: true,
      ...getJoinData({ roomId, socketId: socket.id }),
    },
  });
};

const disconnect = ({ server, socket }) => {
  log({ socketId: socket.id, message: 'disconnect' });

  if (isUserInARoom(socket.id)) {
    removeUserAndUpdateRoom({ server, socketId: socket.id });
  }

  clearSocketLatencyInterval(socket.id);
  removeSocketLatencyData(socket.id);
};

const transferHost = ({ server, socket, data: desiredHostId }) => {
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
    server,
    roomId,
    hostId: desiredHostId,
  });
};

const playerStateUpdate = ({
  server, socket, data: {
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

  emitPlayerStateUpdateToRoom({ server, socketId: socket.id });
};

const mediaUpdate = ({
  server, socket, data: {
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
      server,
      socketId: socket.id,
      eventName: 'newHost',
      data: socket.id,
    });

    log({
      socketId: socket.id,
      message: 'Making host because user initiated media change',
    });
  }

  emitMediaUpdateToRoom({ server, socketId: socket.id, makeHost });
};

const slPong = ({
  server, pingInterval, socket, data: secret,
}) => {
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
      sendPing({ server, socketId: socket.id });
    }, pingInterval),
  });
};

const sendMessage = ({ server, socket, data: text }) => {
  if (!isUserInARoom(socket.id)) {
    socket.disconnect(true);
    return;
  }

  emitToUserRoomExcept({
    server,
    eventName: 'newMessage',
    data: {
      text,
      senderId: socket.id,
    },
    exceptSocketId: socket.id,
  });
};

const setPartyPausingEnabled = ({ server, socket, data: isPartyPausingEnabled }) => {
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
    server,
    socketId: socket.id,
    eventName: 'setPartyPausingEnabled',
    data: isPartyPausingEnabled,
  });
};

const setAutoHostEnabled = ({ server, socket, data: isAutoHostEnabled }) => {
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
    server,
    socketId: socket.id,
    eventName: 'setAutoHostEnabled',
    data: isAutoHostEnabled,
  });
};

const partyPause = ({ server, socket, data: isPause }) => {
  if (!isUserInARoom(socket.id) || !isPartyPausingEnabledInSocketRoom(socket.id)) {
    socket.disconnect(true);
    return;
  }

  emitToSocketRoom({
    server,
    socketId: socket.id,
    eventName: 'partyPause',
    data: {
      senderId: socket.id,
      isPause,
    },
  });
};

const syncFlexibilityUpdate = ({ server, socket, data: syncFlexibility }) => {
  if (!isUserInARoom(socket.id)) {
    socket.disconnect(true);
    return;
  }

  updateUserSyncFlexibility({
    socketId: socket.id,
    syncFlexibility,
  });

  emitToUserRoomExcept({
    server,
    eventName: 'syncFlexibilityUpdate',
    data: {
      syncFlexibility,
      id: socket.id,
    },
    exceptSocketId: socket.id,
  });
};

const eventHandlers = {
  join,
  slPong,
  playerStateUpdate,
  mediaUpdate,
  syncFlexibilityUpdate,
  transferHost,
  sendMessage,
  setPartyPausingEnabled,
  setAutoHostEnabled,
  partyPause,
  disconnect,
};

const attachEventHandlers = ({ server, pingInterval }) => {
  server.on('connection', (socket) => {
    const forwardedHeader = socket.handshake.headers['x-forwarded-for'];
    const addressInfo = forwardedHeader
      ? `${forwardedHeader} (${socket.conn.remoteAddress})`
      : socket.conn.remoteAddres;

    log({ socketId: socket.id, message: `connection: ${addressInfo}` });
    initSocketLatencyData(socket.id);
    sendPing({ server, socketId: socket.id });

    Object.entries(eventHandlers).forEach(([name, handler]) => {
      socket.on(name, (data) => {
        // TODO: eventually pass in state to everything rather than having it all global
        // TODO: move ping interval into state too
        handler({
          server, pingInterval, socket, data,
        });
      });
    });

    // Register handlers
  });
};

export default attachEventHandlers;
