import type { Server, Socket } from "socket.io";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { Chat } from "../models/chat.js";

interface AuthToken extends JwtPayload {
  user?: { _id?: string };
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export const configureSocketServer = (io: Server) => {
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    const secret = process.env.JWT_SECRET;

    if (typeof token !== "string" || !secret) {
      next(new Error("Authentication required"));
      return;
    }

    try {
      const decoded = jwt.verify(token, secret) as AuthToken;
      if (!decoded.user?._id) {
        next(new Error("Invalid authentication token"));
        return;
      }
      socket.userId = decoded.user._id;
      next();
    } catch {
      next(new Error("Invalid authentication token"));
    }
  });

  io.on("connection", (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const userId = socket.userId;
    if (!userId) return;
    void socket.join(`user:${userId}`);

    socket.on("join-chat", async (chatId: unknown, acknowledge?: (result: { ok: boolean }) => void) => {
      if (typeof chatId !== "string") {
        acknowledge?.({ ok: false });
        return;
      }
      try {
        const chat = await Chat.findById(chatId).select("users");
        const isParticipant = chat?.users.some((participantId) => participantId === userId);
        if (!isParticipant) {
          acknowledge?.({ ok: false });
          return;
        }
        await socket.join(`chat:${chatId}`);
        acknowledge?.({ ok: true });
      } catch (error) {
        console.error("Unable to join chat room", error);
        acknowledge?.({ ok: false });
      }
    });

    socket.on("leave-chat", (chatId: unknown) => {
      if (typeof chatId === "string") void socket.leave(`chat:${chatId}`);
    });

    socket.on("typing", async (chatId: unknown, isTyping: unknown) => {
      if (typeof chatId !== "string" || typeof isTyping !== "boolean") return;
      const room = `chat:${chatId}`;
      if (socket.rooms.has(room)) {
        socket.to(room).emit("typing", { chatId, userId, isTyping });
      }
    });
  });
};
