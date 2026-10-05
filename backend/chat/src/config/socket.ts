import type { Server } from "socket.io";

let socketServer: Server | null = null;

export const setSocketServer = (server: Server) => {
  socketServer = server;
};

export const emitToUsers = (userIds: string[], event: string, payload: unknown) => {
  for (const userId of userIds) {
    socketServer?.to(`user:${userId}`).emit(event, payload);
  }
};
