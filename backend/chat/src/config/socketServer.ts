import type { Server, Socket } from "socket.io";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { Chat } from "../models/chat.js";
import { Messages } from "../models/messages.js";
import { emitToUsers } from "./socket.js";

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

    void (async () => {
      try {
        const userSockets = await io.in(`user:${userId}`).fetchSockets();
        const chats = await Chat.find({ users: userId }).select("users");
        const contactIds = new Set(
          chats.flatMap((chat) => chat.users.filter((participantId) => participantId !== userId)),
        );
        const contactsWithOnlineStatus = await Promise.all(
          [...contactIds].map(async (contactId) => ({
            contactId,
            isOnline: (await io.in(`user:${contactId}`).fetchSockets()).length > 0,
          })),
        );
        socket.emit(
          "presence-snapshot",
          contactsWithOnlineStatus
            .filter(({ isOnline }) => isOnline)
            .map(({ contactId }) => contactId),
        );

        if (userSockets.length === 1) {
          for (const contactId of contactIds) {
            io.to(`user:${contactId}`).emit("presence-update", { userId, isOnline: true });
          }
        }
      } catch (error) {
        console.error("Unable to initialize chat presence", error);
      }
    })();

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

    socket.on("message-delivered", async (payload: unknown) => {
      if (
        !payload ||
        typeof payload !== "object" ||
        !("chatId" in payload) ||
        typeof payload.chatId !== "string" ||
        !("messageId" in payload) ||
        typeof payload.messageId !== "string"
      ) {
        return;
      }

      try {
        const chat = await Chat.findById(payload.chatId).select("users");
        if (!chat?.users.includes(userId)) return;

        const message = await Messages.findOneAndUpdate(
          {
            _id: payload.messageId,
            chatId: chat._id,
            sender: { $ne: userId },
            deliveredAt: null,
          },
          { $set: { deliveredAt: new Date() } },
          { new: true },
        ).select("sender");
        if (message) {
          emitToUsers([message.sender], "messages-delivered", {
            chatId: payload.chatId,
            recipientId: userId,
            messageIds: [payload.messageId],
          });
        }
      } catch (error) {
        console.error("Unable to record delivered message", error);
      }
    });

    socket.on("disconnect", () => {
      void (async () => {
        try {
          const connectedSockets = await io.in(`user:${userId}`).fetchSockets();
          if (connectedSockets.length > 0) return;

          const chats = await Chat.find({ users: userId }).select("users");
          const contactIds = new Set(
            chats.flatMap((chat) => chat.users.filter((participantId) => participantId !== userId)),
          );
          for (const contactId of contactIds) {
            const contactSockets = await io.in(`user:${contactId}`).fetchSockets();
            if (contactSockets.length > 0) {
              io.to(`user:${contactId}`).emit("presence-update", { userId, isOnline: false });
            }
          }
        } catch (error: unknown) {
          console.error("Unable to broadcast chat presence", error);
        }
      })();
    });
  });
};
