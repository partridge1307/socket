import 'dotenv/config';
import { handleMessage } from './controller/message';
import { createGeneralNotify } from './controller/notify';
import {
  findUserBySocketId,
  handleUserConnect,
  handleUserDisconnect,
} from './controller/user';
import { io } from './lib/io';

export enum notifyType {
  LIKE = 'LIKE',
  COMMENT = 'COMMENT',
  MENTION = 'MENTION',
  FOLLOW = 'FOLLOW',
  SYSTEM = 'SYSTEM',
}

io.on('connection', (socket) => {
  socket.on('userConnect', (userId) => {
    handleUserConnect(socket.id, userId);
  });
  socket.on('disconnect', () => {
    handleUserDisconnect(socket.id);
  });

  socket.on(
    'notify',
    ({ type, payload }: { type: notifyType; payload: number }) => {
      const fromOnlineUser = findUserBySocketId(socket.id);
      if (!fromOnlineUser) return;

      switch (type) {
        case notifyType.LIKE:
        case notifyType.COMMENT:
        case notifyType.MENTION: {
          createGeneralNotify(fromOnlineUser, { type, payload });
          return;
        }

        default:
          return;
      }
    }
  );

  socket.on(
    'message',
    ({
      content,
      conversationId,
    }: {
      content: string;
      conversationId: number;
    }) => handleMessage(content, conversationId)
  );
});

io.listen(process.env.PORT);
