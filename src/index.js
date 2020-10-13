#!/usr/bin/env node

import config from './config';
import socketServer from './socketserver';

const parsedConfig = config();

socketServer(parsedConfig);
