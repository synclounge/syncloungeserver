import {
  doesRoomExist, isUserInARoom, getRoomUserData, updateUserRtt,
  getJoinData, isRoomPasswordCorrect, createRoom, addUserToRoom, isUserHost,
  removeUserHost, getUserRoomName, isUserInRoom,
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

const join = ({
  socket, data: {
    roomName, roomPassword, desiredUsername, desiredPartyPausingEnabled, thumb, timeline,
    plexClientLatency,
  },
}) => {
  // // TODO: log
  // // TODO: validate timeline thign

  if (isUserInARoom(socket.id)) {
    removeUserAndUpdateRoom(socket.id);
  }

  const roomExists = doesRoomExist(roomName);

  if (roomExists) {
    if (!isRoomPasswordCorrect({ roomName, roomPassword })) {
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
  } else {
    createRoom({
      roomName,
      roomPassword,
      isPartyPausingEnabled: desiredPartyPausingEnabled,
    });
    // TODO: start ping thing
  }

  addUserToRoom({
    socketId: socket.id,
    roomName,
    desiredUsername,
    thumb,
    timeline,
    plexClientLatency,
  });

  // Broadcast user joined to everyone but this
  emitToRoomExcept({
    roomName,
    exceptSocketId: socket.id,
    eventName: 'user-joined',
    data: getRoomUserData({ roomName, socketId: socket.id }),
  });

  emitToSocket({
    socketId: socket.id,
    eventName: 'join-result',
    data: {
      success: true,
      ...getJoinData({ roomName, socketId: socket.id }),
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
    const roomName = getUserRoomName(socket.id);
    if (isUserInRoom({ roomName, socketId: desiredHostId })) {
      removeUserHost(socket.id);
      makeUserHostAndAnnounce({
        roomName,
        desiredHostId,
      });
    }
  }
};

export default {
  join,
  disconnect,
  onTransferHost,
};
