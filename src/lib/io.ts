import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);

declare global {
  var cachedIo: Server;
}

let io: Server;
if (process.env.ENV === 'production') {
  io = new Server(server, {
    cors: {
      origin: process.env.URL,
    },
  });
} else if (process.env.ENV === 'development') {
  if (!global.cachedIo) {
    global.cachedIo = new Server(server, {
      cors: {
        origin: process.env.URL,
      },
    });
  }
  io = global.cachedIo;
} else throw Error('Not found ENV');

export { app, io, server };
