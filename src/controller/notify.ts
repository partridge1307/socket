import type { NotifyType } from '@prisma/client';
import { db } from '../lib/db';
import { io } from '../lib/io';
import { findUserBySocketId, findUserByUserId } from './user';
import type { Socket } from 'socket.io';

const sendRealTimeNotify = (
  socketId: string,
  type: NotifyType,
  content: string,
  notifyId: number,
  endPoint: string
) => io.to(socketId).emit('notify', { type, content, notifyId, endPoint });

type NotMentionType = {
  type: 'COMMENT' | 'CHAT' | 'FOLLOW';
};

type MentionType = {
  type: 'MENTION';
  users: { id: string; name: string }[];
};

type NotifyProps = {
  id: number;
  callbackURL?: string;
} & (NotMentionType | MentionType);

export default function handleNotify(payload: NotifyProps, socket: Socket) {
  if (payload.type === 'CHAT') {
    const { type, id } = payload;
    return handleChat({ type, id, socket });
  }
}

const handleChat = async ({
  type,
  id,
  socket,
}: {
  type: NotifyType;
  id: number;
  socket: Socket;
}) => {
  const conversation = await db.conversation.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      users: {
        select: {
          id: true,
        },
      },
    },
  });
  if (!conversation) return;

  const socketUser = findUserBySocketId(socket.id);
  if (!socketUser) return;

  const fromUser = await db.user.findUnique({
    where: {
      id: socketUser.userId,
    },
    select: {
      id: true,
      name: true,
    },
  });
  if (!fromUser) return;

  const targetUser = conversation.users.filter(
    (user) => user.id !== fromUser.id
  );

  await db.notify.createMany({
    data: targetUser.map((user) => ({
      type,
      toUserId: user.id,
      content: `${fromUser.name} vừa nhắn tin cho bạn`,
      endPoint: `/chat?id=${conversation.id}`,
    })),
  });
};
