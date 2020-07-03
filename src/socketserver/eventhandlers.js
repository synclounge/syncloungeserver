import {
  doesRoomExist, isUserInARoom, getRoomUserData, updateUserRtt,
  getJoinData, removeUser, isRoomPasswordCorrect, createRoom, addUserToRoom,
} from './state';
import { emitToRoomExcept, emitToSocket } from './socketactions';

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
    // If this user has joined before (which they shouldn't without leaving)
    // TODO: disconnect stuff and remove
    // TODO: uh like remove everythign and event handlers
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
    removeUser(socket.id);

  }
};

export default {
  join,
  disconnect,
};
