import { Server } from 'socket.io';
import { config } from 'dotenv';
config();

declare global {
  var cachedIo: Server;
}

let socket;
if (process.env.NODE_ENV === 'production') {
  socket = new Server({
    cors: {
      origin: process.env.URL,
    },
  });
} else {
  if (!global.cachedIo) {
    global.cachedIo = new Server({
      cors: {
        origin: process.env.URL,
      },
    });
  }
  socket = global.cachedIo;
}

export const io = socket;
