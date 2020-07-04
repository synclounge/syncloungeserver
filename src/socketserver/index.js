import io from 'socket.io';
import {
  doesRoomExist, isUserInARoom, getRoomUserData, isUserHost, removeSocketLatencyData,
  getJoinData, isRoomPasswordCorrect, createRoom, addUserToRoom, clearSocketLatencyInterval,
  getUserRoomId, isUserInRoom, updateUserMedia, makeUserHost, updateUserPlayerState,
  getSocketPingSecret, updateSocketLatency, setSocketLatencyIntervalId, doesSocketHaveRtt,
  getRoomSocketIds, removeUser, isRoomEmpty, removeRoom, getAnySocketIdInRoom,
  generateAndSetSocketLatencySecret, initSocketLatencyData, formatUserData, getRoomHostId,
} from './state';

const server = io({
  serveClient: false,
  cookie: false,
  // Use websockets first
  transports: ['websockets', 'polling'],
});

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

  if (getRoomHostId(roomId)) {
    // Make someone else host
    const desiredHostId = getAnySocketIdInRoom(roomId);
    makeUserHost(desiredHostId);
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

const log = ({ socketId, message }) => {
  console.log(`[${socketId}]`, message);
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
    roomId, password, desiredUsername, desiredPartyPausingEnabled, thumb, playerProduct, state,
    time, duration, media,
  },
}) => {
  log({ socketId: socket.id, message: `join "${roomId}"` });
  // // TODO: log
  // // TODO: validate timeline thign

  if (!doesSocketHaveRtt(socket.id)) {
    // Ignore join if we don't have rtt yet.
    // Client should never do this so this just exists for bad actors
    log({ socketId: socket.id, message: 'Socket tried to join without finishing initial ping/pong' });
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
    console.log('Creating room', roomId);
    createRoom({
      id: roomId,
      password,
      isPartyPausingEnabled: desiredPartyPausingEnabled,
      hostId: socket.id,
    });
    // TODO: start ping thing
  }

  addUserToRoom({
    socketId: socket.id,
    roomId,
    desiredUsername,
    thumb,
    playerProduct,
  });

  updateUserPlayerState({
    socketId: socket.id, state, time, duration,
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
  if (!isUserInARoom(socket.id)) {
    return;
  }

  if (isUserHost(socket.id)) {
    const roomId = getUserRoomId(socket.id);
    if (isUserInRoom({ roomId, socketId: desiredHostId })) {
      makeUserHost(desiredHostId);
      announceNewHost({
        roomId,
        hostId: desiredHostId,
      });
    }
  }
};

const emitPlayerStateUpdateToRoom = (socketId) => {
  const {
    updatedAt, state, time, duration,
  } = getRoomUserData(socketId);

  emitAdjustedUserDataToRoom({
    eventName: 'playerStateUpdate',
    exceptSocketId: socketId,
    userData: {
      updatedAt,
      state,
      time,
      duration,
    },
  });
};

const playerStateUpdate = ({
  socket, data: { state, time, duration },
}) => {
  if (!isUserInARoom(socket.id)) {
    return;
  }

  updateUserPlayerState({
    socketId: socket.id, state, time, duration,
  });

  emitPlayerStateUpdateToRoom(socket.id);
};

const emitMediaUpdateToRoom = (socketId) => {
  const {
    updatedAt, state, time, duration, media,
  } = getRoomUserData(socketId);

  emitAdjustedUserDataToRoom({
    eventName: 'mediaUpdate',
    exceptSocketId: socketId,
    userData: {
      updatedAt,
      state,
      time,
      duration,
      media,
    },
  });
};

const mediaUpdate = ({
  socket, data: {
    state, time, duration, media,
  },
}) => {
  if (!isUserInARoom(socket.id)) {
    return;
  }

  updateUserPlayerState({
    socketId: socket.id, state, time, duration,
  });

  updateUserMedia({
    socketId: socket.id,
    media,
  });

  emitMediaUpdateToRoom(socket.id);
};

const slPong = ({ socket, data: secret }) => {
  const expectedSecret = getSocketPingSecret(socket.id);
  if (getSocketPingSecret(socket.id) === null || secret !== expectedSecret) {
    console.warn('Incorrect secret');
    return;
  }

  updateSocketLatency(socket.id);

  setSocketLatencyIntervalId({
    socketId: socket.id,
    intervalId: setTimeout(() => {
      sendPing(socket.id);
      // TODO: put interval in config
    }, 10000),
  });
};

const sendMessage = ({ socket, data: text }) => {
  if (!isUserInARoom(socket.id)) {
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
  registerEvent({ eventName: 'transferHost', handler: transferHost });
  registerEvent({ eventName: 'sendMessage', handler: sendMessage });
  registerEvent({ eventName: 'disconnect', handler: disconnect });
});

export default server;
