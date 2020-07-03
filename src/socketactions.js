import socketServer from '.';

import {
  getRoomSocketIds,
} from './state';

export const emitToRoomExcept = ({
  room, eventName, data, exceptSocketId,
}) => {
  getRoomSocketIds(room)
    .filter((socketId) => socketId !== exceptSocketId)
    .forEach((socketId) => {
      socketServer.to(socketId).emit(eventName, data);
    });
};
