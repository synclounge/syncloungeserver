import server from './server';

import {
  getRoomSocketIds, isUserHost, removeUser, getUserRoomId, isRoomEmpty, removeRoom,
  getAnySocketIdInRoom, makeUserHost,
} from './state';

export const emitToSocket = ({ socketId, eventName, data }) => {
  server.to(socketId).emit(eventName, data);
};

export const emitToRoomExcept = ({
  roomId, eventName, data, exceptSocketId,
}) => {
  getRoomSocketIds(roomId)
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
