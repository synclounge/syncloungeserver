import server from './server';
import eventHandlers from './eventhandlers';

server.on('connection', (socket) => {
  // Register handlers
  console.log('connection:', socket.conn.remoteAddress);

  Object.entries(eventHandlers).forEach(([eventName, handler]) => {
    socket.on(eventName, (data) => {
      console.log(data);
      handler({ socket, data });
    });
  });
});

export default server;
