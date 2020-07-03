import {
  doesRoomExist, isUserInARoom, getRoomUserData,
  getJoinData, isRoomPasswordCorrect, createRoom, addUserToRoom, isUserHost,
  removeUserHost, getUserRoomId, isUserInRoom, updateUserMedia, makeUserHost,
} from './state';
import {
  emitToRoom, emitToRoomExcept, emitToSocket, makeUserHostAndAnnounce, removeUserAndUpdateRoom,
} from './socketactions';

// TODO: maybe enable promise cancellation?? test if needed

const onInitialPong = ({ socket, rtt }) => {
  // updateUserRtt({
  //   socketId: socket.id,
  //   rtt,
  // });
};

const getInitialSocketRtt = (socket) => {
  // Now we need to calculate RTT between server and new user
  emitToSocket({
    socketId: socket.id,
    eventName: 'sl-ping',
  });

  const start = Date.now();
  socket.once('sl-pong', () => {
    onInitialPong({
      socket,
      rtt: Date.now() - start,
    });
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
  emitToRoomExcept({
    roomId,
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

const onTransferHost = ({ socket, desiredHostId }) => {
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

const onPlayerStateChange = ({ socket, state, time }) => {

};

const onMediaStateChange = ({
  socket, state, time, media,
}) => {

};

export default {
  join,
  disconnect,
  onTransferHost,
};
