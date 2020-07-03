#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import http from 'http';
import urljoin from 'url-join';

import config from './config';
import socketServer from './socketserver';

const app = express();
const server = http.Server(app);
const router = express.Router();

server.listen(config.get('port'));

app.use(cors());

app.use(config.get('base_url'), router);

socketServer.attach(server, {
  // TODO: Check if options are merged
  path: urljoin(config.get('base_url'), '/socket.io'),
});

// Setup our router
router.get('/', (req, res) => {
  res.send('You\'ve connected to the SLServer, you\'re probably looking for the webapp.');
});

// router.get('/health', (req, res) => {
//   res.setHeader('Content-Type', 'application/json');
//   const connectedUsers = Object.keys(namespace.sockets.connected).length;
//   let load = 'low';
//   if (connectedUsers > 25) {
//     load = 'medium';
//   }
//   if (connectedUsers > 50) {
//     load = 'high';
//   }
//   return res.send(JSON.stringify({ load })).end();
// });

// router.get('/users', (req, res) => {
//   res.setHeader('Content-Type', 'application/json');
//   const users = Object.keys(namespace.sockets.connected).length;
//   return res.send(JSON.stringify({ users })).end();
// });

console.log('SyncLounge Server successfully started on port', config.get('port'));
console.log('Running with base URL:', config.get('base_url'));
