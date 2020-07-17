#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import http from 'http';
import urljoin from 'url-join';

import config from './config';
import socketServer from './socketserver';

import { getHealth } from './socketserver/state';

const app = express();
const server = http.Server(app);
const router = express.Router();

app.use(cors());

app.use(config.get('base_url'), router);

socketServer.attach(server, {
  // TODO: Check if options are merged
  path: urljoin(config.get('base_url'), '/socket.io'),
});

// Setup our router
if (config.get('static_path')) {
  console.log('Serving static files at', config.get('static_path'));
  router.use(express.static(config.get('static_path')));
} else {
  router.get('/', (req, res) => {
    res.send('You\'ve connected to the SLServer, you\'re probably looking for the webapp.');
  });
}

router.get('/health', (req, res) => {
  res.json(getHealth());
});

server.listen(config.get('port'), () => {
  console.log('SyncLounge Server successfully started on port', config.get('port'));
  console.log('Running with base URL:', config.get('base_url'));
});
