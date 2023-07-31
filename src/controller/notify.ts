import { Prisma, User } from '@prisma/client';
import { notifyType } from '..';
import { db } from '../lib/db';
import { findUserByUserId } from './user';
import { io } from '../lib/io';

const sendNotifyToOnlineUser = (
  targetUserId: string,
  fromUser: Pick<User, 'name'>,
  type: notifyType,
  data: { id: number; mangaId?: number; chapterId?: number | null }
) => {
  const targetOnlineUser = findUserByUserId(targetUserId);
  if (!targetOnlineUser) return;

  if (
    type === notifyType.LIKE ||
    type === notifyType.COMMENT ||
    type === notifyType.MENTION
  ) {
    io.to(targetOnlineUser.socketId).emit('notify', {
      type,
      data: {
        id: data.id,
        fromUser: fromUser,
        mangaId: data.mangaId,
        chapterId: data.chapterId,
      },
    });
  }
};

const createGeneralNotify = async (
  fromOnlineUser: {
    socketId: string;
    userId: string;
  },
  data: {
    type: notifyType;
    payload: any;
  }
) => {
  try {
    const comment = await db.comment.findFirstOrThrow({
      where: {
        id: data.payload,
      },
      select: {
        id: true,
        authorId: true,
        mangaId: true,
        chapterId: true,
      },
    });

    const fromUser = await db.user.findFirstOrThrow({
      where: {
        id: fromOnlineUser.userId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    const existNotify = await db.notify.findMany({
      where: {
        fromUserId: fromUser.id,
        toUserId: comment.authorId,
        content: {
          path: ['commentId'],
          equals: comment.id,
        },
      },
    });

    if (
      data.type === notifyType.LIKE ||
      data.type === notifyType.COMMENT ||
      data.type === notifyType.MENTION
    ) {
      if (existNotify.some((noti) => noti.type === data.type)) return;

      const createdNotify = await db.notify.create({
        data: {
          type: data.type,
          fromUserId: fromUser.id,
          toUserId: comment.authorId,
          content: {
            commentId: comment.id,
            mangaId: comment.mangaId,
            chapterId: comment.chapterId,
          },
        },
      });

      return sendNotifyToOnlineUser(comment.authorId, fromUser, data.type, {
        id: createdNotify.id,
        mangaId: comment.mangaId,
        chapterId: comment.chapterId,
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.log(error.message);
    }
    console.log(error);
  }
};

export { createGeneralNotify };
