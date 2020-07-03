import {
  doesRoomExist, isUserInARoom, getRoomUserData, updateUserRtt,
  getJoinData, isRoomPasswordCorrect, createRoom, addUserToRoom, isUserHost,
  removeUserHost, getUserRoomId, isUserInRoom, updateUserMedia,
} from './state';
import {
  emitToRoomExcept, emitToSocket, makeUserHostAndAnnounce, removeUserAndUpdateRoom,
} from './socketactions';

// TODO: maybe enable promise cancellation?? test if needed

const onInitialPong = ({ socket, rtt }) => {
  updateUserRtt({
    socketId: socket.id,
    rtt,
  });
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

const createAndJoin = ({
  socket, roomPassword, isPartyPausingEnabled,
}) => {
  const roomId = createRoom({
    roomId,
    roomPassword,
    isPartyPausingEnabled,
  });
};

const join = ({
  socket, data: {
    roomId, roomPassword, desiredUsername, thumb, state, time, media,
  },
}) => {
  // // TODO: log
  // // TODO: validate timeline thign

  if (isUserInARoom(socket.id)) {
    removeUserAndUpdateRoom(socket.id);
  }

  if (!isRoomPasswordCorrect({ roomId, roomPassword })) {
    emitToSocket({
      socketId: socket.id,
      eventName: 'join-result',
      data: {
        success: false,
        error: 'Password wrong',
      },
    });
    return;
  }

  addUserToRoom({
    socketId: socket.id,
    roomId,
    desiredUsername,
    thumb,
  });

  updateUserMedia({
    socketId: state.socketId,
    state,
    time,
    media,
  });

  // Broadcast user joined to everyone but this
  emitToRoomExcept({
    roomId,
    exceptSocketId: socket.id,
    eventName: 'user-joined',
    data: getRoomUserData(socket.id),
  });

  emitToSocket({
    socketId: socket.id,
    eventName: 'join-result',
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
      makeUserHostAndAnnounce({
        roomId,
        desiredHostId,
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
