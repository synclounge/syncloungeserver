#!/usr/bin/env node

import config from './config';
import socketServer from './socketserver';

// Using a single function to handle multiple signals
const handle = (signal) => {
  console.log(`Received ${signal}. Exiting`);
  process.exit(0);
};

process.on('SIGINT', handle);
process.on('SIGTERM', handle);

const parsedConfig = config.get();

socketServer({
  baseUrl: parsedConfig.base_url,
  staticPath: parsedConfig.static_path,
  port: parsedConfig.port,
  pingInterval: parsedConfig.ping_interval,
});
