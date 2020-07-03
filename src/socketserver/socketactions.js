import server from './server';

import {
  getRoomSocketIds, isUserHost, removeUser, getUserRoomName, isRoomEmpty, removeRoom,
  getAnySocketIdInRoom, makeUserHost,
} from './state';

export const emitToSocket = ({ socketId, eventName, data }) => {
  server.to(socketId).emit(eventName, data);
};

export const emitToRoomExcept = ({
  roomName, eventName, data, exceptSocketId,
}) => {
  getRoomSocketIds(roomName)
    .filter((socketId) => socketId !== exceptSocketId)
    .forEach((socketId) => {
      emitToSocket({ socketId, eventName, data });
    });
};

const emitToRoom = ({ roomName, eventName, data }) => {
  getRoomSocketIds(roomName).forEach((socketId) => {
    emitToSocket({ socketId, eventName, data });
  });
};

export const makeUserHostAndAnnounce = ({ roomName, desiredHostId }) => {
  makeUserHost({ roomName, socketId: desiredHostId });

  emitToRoom({
    roomName,
    eventName: 'newHost',
    data: desiredHostId,
  });
};

export const removeUserAndUpdateRoom = (socketId) => {
  const wasUserHost = isUserHost(socketId);
  const roomName = getUserRoomName(socketId);

  removeUser(socketId);

  if (isRoomEmpty(roomName)) {
    removeRoom(roomName);
    return;
  }

  if (wasUserHost) {
    // Make someone else host
    const desiredHostId = getAnySocketIdInRoom(roomName);
    makeUserHostAndAnnounce({
      roomName,
      desiredHostId,
    });
  }
};
