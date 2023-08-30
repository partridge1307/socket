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
  if (payload.type === 'COMMENT') {
    const { type, id, callbackURL } = payload;
    return handleComment(type, id, callbackURL);
  }
  if (payload.type === 'MENTION') {
    const { type, id, users, callbackURL } = payload;
    return handleMention({ type, id, users, callbackURL });
  }
  if (payload.type === 'CHAT') {
    const { type, id } = payload;
    return handleChat({ type, id, socket });
  }
  if (payload.type === 'FOLLOW') {
    const { type, id } = payload;
    return handleFollow({ type, id });
  }
}

const handleComment = async (
  type: NotifyType,
  id: number,
  callbackURL?: string
) => {
  const from = callbackURL?.includes('forum')
    ? 'FORUM'
    : callbackURL?.includes('manga') || callbackURL?.includes('chapter')
    ? 'MANGA'
    : null;

  if (from === 'FORUM') {
    const postComment = await db.postComment.findUnique({
      where: {
        id,
      },
      select: {
        creatorId: true,
        postId: true,
        post: {
          select: {
            subForum: {
              select: {
                slug: true,
              },
            },
          },
        },
      },
    });
    if (!postComment) return;

    const content = `Ai đó đã phản hồi bình luận của bạn trong Forum`;

    const createdNotify = await db.notify.create({
      data: {
        type,
        toUserId: postComment.creatorId,
        content,
        endPoint: `/m/${postComment.post.subForum.slug}/${postComment.postId}`,
      },
    });

    const user = findUserByUserId(postComment.creatorId);

    if (user) {
      sendRealTimeNotify(
        user.socketId,
        type,
        content,
        createdNotify.id,
        createdNotify.endPoint
      );
    }
  } else if (from === 'MANGA') {
    const comment = await db.comment.findUnique({
      where: {
        id,
      },
      select: {
        mangaId: true,
        authorId: true,
      },
    });
    if (!comment) return;

    const content = `Ai đó đã phản hồi bình luận của bạn trong Manga`;

    const createdNotify = await db.notify.create({
      data: {
        type,
        toUserId: comment.authorId,
        content,
        endPoint: `/manga/${comment.mangaId}`,
      },
    });

    const user = findUserByUserId(comment.authorId);

    if (user) {
      sendRealTimeNotify(
        user.socketId,
        type,
        content,
        createdNotify.id,
        createdNotify.endPoint
      );
    }
  }
};

const handleMention = async ({
  type,
  id,
  users,
  callbackURL,
}: {
  type: NotifyType;
  id: number;
  users: { id: string; name: string }[];
  callbackURL?: string;
}) => {
  const from = callbackURL?.includes('forum')
    ? 'FORUM'
    : callbackURL?.includes('manga') || callbackURL?.includes('chapter')
    ? 'MANGA'
    : null;

  if (from === 'FORUM') {
    const postComment = await db.postComment.findUnique({
      where: {
        id,
      },
      select: {
        postId: true,
        post: {
          select: {
            subForum: {
              select: {
                slug: true,
              },
            },
          },
        },
      },
    });
    if (!postComment) return;

    const content = `Ai đó đã Tag bạn trong Forum`;

    await db.notify.createMany({
      data: users.map((user) => ({
        type,
        toUserId: user.id,
        content,
        endPoint: `/m/${postComment.post.subForum.slug}/${postComment.postId}`,
      })),
      skipDuplicates: true,
    });
  } else if (from === 'MANGA') {
    const comment = await db.comment.findUnique({
      where: {
        id,
      },
      select: {
        authorId: true,
        mangaId: true,
      },
    });
    if (!comment) return;

    const content = `Ai đó đã Tag bạn trong Manga`;

    await db.notify.createMany({
      data: users.map((user) => ({
        type,
        toUserId: user.id,
        content,
        endPoint: `/manga/${comment.mangaId}`,
      })),
      skipDuplicates: true,
    });
  }
};

const handleFollow = async ({ type, id }: { type: NotifyType; id: number }) => {
  const chapter = await db.chapter.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      manga: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  if (!chapter) return;

  const usersFollow = await db.mangaFollow.findMany({
    where: {
      mangaId: chapter.manga.id,
    },
    select: {
      userId: true,
    },
  });

  await db.notify.createMany({
    data: usersFollow.map((userFollow) => ({
      type: 'FOLLOW',
      toUserId: userFollow.userId,
      content: `${chapter.manga.name} đã ra Chapter mới rồi đó`,
      endPoint: `/chapter/${chapter.id}`,
    })),
  });
};

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
