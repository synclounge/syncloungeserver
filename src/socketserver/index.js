import io from 'socket.io';
import {
  doesRoomExist, isUserInARoom, getRoomUserData,
  getJoinData, isRoomPasswordCorrect, createRoom, addUserToRoom, isUserHost,
  removeUserHost, getUserRoomId, isUserInRoom, updateUserMedia, makeUserHost, updatePlayerState,
  getSocketPingSecret, updateSocketLatency, setSocketLatencyIntervalId, doesSocketHaveRtt,
  getRoomSocketIds, removeUser, isRoomEmpty, removeRoom, getAnySocketIdInRoom,
  generateAndSetSocketLatencySecret, initSocketLatencyData,
} from './state';

const server = io({
  serveClient: false,
  cookie: false,
  // Use websockets first
  transports: ['websockets', 'polling'],
});

export const emitToSocket = ({ socketId, eventName, data }) => {
  server.to(socketId).emit(eventName, data);
};

export const emitToUserRoomExcept = ({
  eventName, data, exceptSocketId,
}) => {
  getRoomSocketIds(getUserRoomId(exceptSocketId))
    .filter((socketId) => socketId !== exceptSocketId)
    .forEach((socketId) => {
      emitToSocket({ socketId, eventName, data });
    });
};

export const emitToRoom = ({ roomId, eventName, data }) => {
  getRoomSocketIds(roomId).forEach((socketId) => {
    emitToSocket({ socketId, eventName, data });
  });
};

export const makeUserHostAndAnnounce = ({ roomId, desiredHostId }) => {
  emitToRoom({
    roomId,
    eventName: 'newHost',
    data: desiredHostId,
  });
};

export const removeUserAndUpdateRoom = (socketId) => {
  const wasUserHost = isUserHost(socketId);
  const roomId = getUserRoomId(socketId);

  removeUser(socketId);

  if (isRoomEmpty(roomId)) {
    removeRoom(roomId);
    return;
  }

  if (wasUserHost) {
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

export const sendPing = (socketId) => {
  const secret = generateAndSetSocketLatencySecret(socketId);

  emitToSocket({
    socketId,
    eventName: 'slPing',
    data: secret,
  });
};

const log = ({ socketId, message }) => {
  console.log(socketId, message);
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

  updateUserMedia({
    socketId: socket.id,
    state,
    time,
    duration,
    media,
  });

  // Broadcast user joined to everyone but this
  emitToUserRoomExcept({
    exceptSocketId: socket.id,
    eventName: 'userJoined',
    data: getRoomUserData(socket.id),
  });

  console.log('joinResponse', getJoinData({ roomId, socketId: socket.id }));
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
  console.log('disconnect');
  if (isUserInARoom(socket.id)) {
    removeUserAndUpdateRoom(socket.id);
  }
};

const transferHost = ({ socket, data: desiredHostId }) => {
  if (isUserHost(socket.id)) {
    const roomId = getUserRoomId(socket.id);
    if (isUserInRoom({ roomId, socketId: desiredHostId })) {
      removeUserHost(socket.id);
      makeUserHost(desiredHostId);
      makeUserHostAndAnnounce({
        roomId,
        desiredHostId,
      });

      emitToRoom({
        roomId,
        eventName: 'hostSwap',
        data: {
          oldHostId: socket.id,
          newHostId: desiredHostId,
        },
      });
    }
  }
};

const playerStateUpdate = ({
  socket, data: { state, time, duration },
}) => {
  updatePlayerState({
    socketId: socket.id, state, time, duration,
  });
};

const mediaUpdate = ({
  socket, data: { state, time, media },
}) => {
  emitToUserRoomExcept({
    exceptSocketId: socket.id,
    eventName: 'asldfjlakf',
    data: getRoomUserData(socket.id),
  });
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

server.on('connection', (socket) => {
  console.log('connection:', socket.conn.remoteAddress);
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
  registerEvent({ eventName: 'disconnect', handler: disconnect });
});

export default server;
