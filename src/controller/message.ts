import { db } from '../lib/db';
import { io } from '../lib/io';
import { findUserByUserId } from './user';

const handleMessage = async (content: string, conversationId: number) => {
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

    const usersSocketId = usersInConversation.users.map((user) => {
      const onlineUser = findUserByUserId(user.id);

      if (onlineUser)
        return {
          socketId: onlineUser.socketId,
          user,
        };
    });

    usersSocketId.map((user) => {
      if (user) {
        const dbUser = user.user;

        io.to(user.socketId).emit('message', {
          content,
          sender: {
            ...dbUser,
          },
        });
      }
    });
  } catch (error) {
    console.log(error);
  }
};

export { handleMessage };
