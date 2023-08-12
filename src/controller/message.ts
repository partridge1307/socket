import { db } from '../lib/db';
import { io } from '../lib/io';
import { findUserByUserId } from './user';

const handleMessage = async ({
  content,
  conversationId,
  senderId,
}: {
  content: string;
  conversationId: number;
  senderId: string;
}) => {
  try {
    const usersInConversation = await db.conversation.findFirstOrThrow({
      where: {
        id: conversationId,
      },
      select: {
        users: {
          select: {
            id: true,
            name: true,
            color: true,
            image: true,
          },
        },
      },
    });

    const usersSocketId = usersInConversation.users
      .map((user) => {
        const onlineUser = findUserByUserId(user.id);

        if (onlineUser)
          return {
            socketId: onlineUser.socketId,
            user,
          };
      })
      .filter((userSocket) => typeof userSocket !== 'undefined');

    const sender = usersSocketId.find(
      (user) => user?.user.id === senderId
    )?.user;

    usersSocketId.map((user) => {
      if (user) {
        io.to(user.socketId).emit(`message:${conversationId}`, {
          content,
          sender: {
            ...sender,
          },
        });
      }
    });
  } catch (error) {
    console.log(error);
  }
};

export { handleMessage };
