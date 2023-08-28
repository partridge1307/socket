import 'dotenv/config';
import { handleMessage } from './controller/message';
import { handleUserConnect, handleUserDisconnect } from './controller/user';
import { io, server, app } from './lib/io';
import client from './lib/discord';
import serverRoutes from './router/server';

io.on('connection', (socket) => {
  socket.on('userConnect', (userId) => {
    handleUserConnect(socket.id, userId);
  });
  socket.on('disconnect', () => {
    handleUserDisconnect(socket.id);
  });

  socket.on('message', (payload) => handleMessage(payload));
});

app.use('/api/v1/server', serverRoutes);

client.login(process.env.BOT_TOKEN);
server.listen(process.env.PORT, () => {
  console.log(`Start on PORT ${process.env.PORT}`);
});
