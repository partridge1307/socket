import 'dotenv/config';
import {
  findUserBySocketId,
  findUserByUserId,
  handleUserConnect,
  handleUserDisconnect,
  onlineUsers,
} from './controller/user';
import { db } from './lib/db';
import { io } from './lib/io';

io.on('connection', (socket) => {
  socket.on('userConnect', (userId) => {
    handleUserConnect(socket.id, userId);
    io.emit('onlineUsers', onlineUsers.length);
  });
  socket.on('disconnect', () => {
    handleUserDisconnect(socket.id);
    io.emit('onlineUsers', onlineUsers.length);
  });
});

io.listen(process.env.PORT);

// socket.on('notify', async (data: { type: number; payload: any }) => {
//   const { type, payload } = data;
//   const fromOnlineUser = findUserBySocketId(socket.id);

//   switch (type) {
//     case 0: {
//       const toComment = await db.comment.findFirst({
//         where: {
//           id: payload,
//         },
//         select: {
//           authorId: true,
//           mangaId: true,
//           chapterId: true,
//         },
//       });

//       if (toComment && fromOnlineUser) {
//         const existNotify = await db.notify.findFirst({
//           where: {
//             fromUserId: fromOnlineUser.userId,
//             toUserId: toComment.authorId,
//             type: 'LIKE',
//           },
//         });

//         if (!existNotify) {
//           await db.notify.create({
//             data: {
//               type: 'LIKE',
//               fromUserId: fromOnlineUser.userId,
//               toUserId: toComment.authorId,
//             },
//           });

//           const targetOnlineUser = findUserByUserId(toComment.authorId);
//           if (!targetOnlineUser) return;

//           const fromUser = await db.user.findFirst({
//             where: {
//               id: fromOnlineUser.userId,
//             },
//             select: {
//               name: true,
//             },
//           });

//           if (fromUser) {
//             io.to(targetOnlineUser.socketId).emit('notify', {
//               type: 0,
//               data: {
//                 fromUsername: fromUser.name,
//                 mangaId: toComment.mangaId,
//                 chapterId: toComment.chapterId,
//               },
//             });
//           }
//         }
//       }

//       return;
//     }

//     case 1: {
//       const toComment = await db.comment.findFirst({
//         where: {
//           id: payload,
//         },
//         select: {
//           authorId: true,
//           mangaId: true,
//           chapterId: true,
//         },
//       });

//       if (toComment && fromOnlineUser) {
//         const existNotify = await db.notify.findFirst({
//           where: {
//             fromUserId: fromOnlineUser.userId,
//             toUserId: toComment.authorId,
//             type: 'COMMENT',
//           },
//         });

//         if (!existNotify) {
//           await db.notify.create({
//             data: {
//               type: 'COMMENT',
//               fromUserId: fromOnlineUser.userId,
//               toUserId: toComment.authorId,
//             },
//           });

//           const targetOnlineUser = findUserByUserId(toComment.authorId);
//           if (!targetOnlineUser) return;

//           const fromUser = await db.user.findFirst({
//             where: {
//               id: fromOnlineUser.userId,
//             },
//             select: {
//               name: true,
//             },
//           });

//           if (fromUser) {
//             io.to(targetOnlineUser.socketId).emit('notify', {
//               type: 1,
//               data: {
//                 fromUsername: fromUser.name,
//                 mangaId: toComment.mangaId,
//                 chapterId: toComment.chapterId,
//               },
//             });
//           }
//         }
//       }
//       return;
//     }

//     default:
//       return;
//   }
// });
