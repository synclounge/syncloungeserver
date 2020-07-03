import io from 'socket.io';

const server = io({
  serveClient: false,
  cookie: false,
});

export default server;
