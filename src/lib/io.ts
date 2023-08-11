import { Server } from 'socket.io';

declare global {
  var cachedIo: Server;
}

let socket;
if (process.env.ENV === 'production') {
  socket = new Server({
    cors: {
      origin: process.env.URL,
    },
  });
} else if (process.env.ENV === 'development') {
  if (!global.cachedIo) {
    global.cachedIo = new Server({
      cors: {
        origin: process.env.URL,
      },
    });
  }
  socket = global.cachedIo;
} else throw Error('Not found ENV');

export const io = socket;
