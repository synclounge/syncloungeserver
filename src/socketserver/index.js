#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import http from 'http';
import urljoin from 'url-join';

import io from 'socket.io';
import attachEventHandlers from './handlers';

import { getHealth } from './state';

const socketServer = ({
  base_url: baseUrl, static_path: staticPath, port, ping_interval: pingInterval,
}) => {
  http.globalAgent.keepAlive = true;

  const app = express();
  const server = http.Server(app);
  const router = express.Router();

  app.use(cors());

  app.use(baseUrl, router);

  const socketio = io({
    serveClient: false,
    cookie: false,
    // Use websockets first
    transports: ['websockets', 'polling'],
  });

  attachEventHandlers({ server: socketio, pingInterval });

  socketio.attach(server, {
    path: urljoin(baseUrl, '/socket.io'),
  });

  // Setup our router
  if (staticPath) {
    console.log('Serving static files at', staticPath);
    router.use(express.static(staticPath));
  } else {
    router.get('/', (req, res) => {
      res.send('You\'ve connected to the SLServer, you\'re probably looking for the webapp.');
    });
  }

  router.get('/health', (req, res) => {
    res.json(getHealth());
  });

  server.listen(port, () => {
    console.log('SyncLounge Server successfully started on port', port);
    console.log('Running with base URL:', baseUrl);
  });
};

export default socketServer;
