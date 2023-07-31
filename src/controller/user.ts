let onlineUsers: { socketId: string; userId: string }[] = [];

const handleUserConnect = (socketId: string, userId: string) => {
  const existUser = findUserByUserId(userId);

  if (existUser) onlineUsers[onlineUsers.indexOf(existUser)].userId = userId;
  else {
    !onlineUsers.some((user) => user.userId === userId) &&
      onlineUsers.push({ socketId, userId });
  }
};

const handleUserDisconnect = (socketId: string) => {
  onlineUsers = onlineUsers.filter((user) => user.socketId !== socketId);
};

const findUserBySocketId = (socketId: string) =>
  onlineUsers.find((user) => user.socketId === socketId);

const findUserByUserId = (userId: string) =>
  onlineUsers.find((user) => user.userId === userId);

export {
  onlineUsers,
  handleUserConnect,
  handleUserDisconnect,
  findUserBySocketId,
  findUserByUserId,
};
