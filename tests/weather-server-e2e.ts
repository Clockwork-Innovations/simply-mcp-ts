#!/usr/bin/env npx tsx
// /// dependencies
// axios@^1.6.0
// date-fns@^2.30.0
// ///

import { SimplyMCP } from '../src/index.js';
import axios from 'axios';
import { format } from 'date-fns';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'weather-server',
  version: '1.0.0'
});

server.addTool({
  name: 'get_time',
  description: 'Get current formatted time',
  parameters: z.object({}),
  execute: async () => {
    return format(new Date(), 'PPpp');
  }
});

server.addTool({
  name: 'echo',
  description: 'Echo a message',
  parameters: z.object({ message: z.string() }),
  execute: async ({ message }) => {
    return `Echo: ${message}`;
  }
});

export default server;
