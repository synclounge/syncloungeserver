#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import http from 'http';
import url from 'url';

import { Server } from 'socket.io';
import attachEventHandlers from './handlers';

import { getHealth } from './state';

const socketServer = ({
  base_url: baseUrl, static_path: staticPath, port, ping_interval: pingInterval,
  preStaticInjection,
}) => {
  http.globalAgent.keepAlive = true;

  const app = express();
  const server = http.Server(app);
  const router = express.Router();

  app.use(cors());

  app.use(baseUrl, router);

  const socketio = new Server(server, {
    path: url.resolve(baseUrl, 'socket.io'),
    cors: {
      origin: '*',
    },
    serveClient: false,
    // Use websockets first
    transports: ['websocket', 'polling'],
  });

  attachEventHandlers({ server: socketio, pingInterval });

  router.get('/health', (req, res) => {
    res.json(getHealth());
  });

  if (preStaticInjection) {
    // User provided function that does something with the router before the static middleware is
    // added.
    // Useful when overriding static files with a custom result
    preStaticInjection(router);
  }

  // Setup our router
  if (staticPath) {
    console.log('Serving static files at', staticPath);
    router.use(express.static(staticPath));
  } else {
    router.get('/', (req, res) => {
      res.send('You\'ve connected to the SLServer, you\'re probably looking for the webapp.');
    });
  }

  server.listen(port, () => {
    console.log('SyncLounge Server successfully started on port', port);
    console.log('Running with base URL:', baseUrl);
  });

  // Return router so users can attach more routes if desired
  return router;
};

export default socketServer;
