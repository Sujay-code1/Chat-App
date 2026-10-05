import TryCatch from "../config/TryCatch.js";
import type { AuthenticatedRequest } from "../middleware/isAuth.js";
import { Chat } from "../models/chat.js";
import { Messages } from "../models/messages.js";
import axios from "axios";
import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary.js";
import { emitToUsers } from "../config/socket.js";

const getUserServiceUrl = () =>
  (process.env.USER_SERVICES ?? "http://localhost:5000").replace(/\/$/, "");

const fetchOtherUser = async (otherUserId: string, authorization?: string) => {
  try {
    const { data } = await axios.get(
      `${getUserServiceUrl()}/api/v1/user/${otherUserId}`,
      authorization ? { headers: { Authorization: authorization } } : {},
    );
    return data;
  } catch (error) {
    console.error(`Unable to fetch chat participant ${otherUserId}`, error);
    return { _id: otherUserId, name: "Unknown user" };
  }
};

const saveImage = async (buffer: Buffer) => {
  if (!isCloudinaryConfigured) {
    throw new Error("Image uploads are unavailable because image storage is not configured");
  }
  return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "chat-images",
          allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
          transformation: [
            { width: 1200, height: 1200, crop: "limit" },
            { quality: "auto" },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else if (!result) reject(new Error("Image upload returned no result"));
          else resolve(result);
        },
      )
      .end(buffer);
  });
};

export const createNewChat = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;
    const otherUserId = req.body.otherUserId as string | undefined;
    if (!userId || !otherUserId || userId === otherUserId) {
      res.status(400).json({ message: "A valid other user is required" });
      return;
    }

    const existingChat = await Chat.findOne({
      users: { $all: [userId, otherUserId], $size: 2 },
    });
    if (existingChat) {
      res.json({ message: "Chat already exists", chatId: existingChat._id });
      return;
    }

    const newChat = await Chat.create({ users: [userId, otherUserId] });
    emitToUsers([userId, otherUserId], "chat-updated", {
      chatId: newChat._id.toString(),
      lastMessage: null,
      updatedAt: newChat.updatedAt,
    });
    res.status(201).json({ message: "New chat created", chatId: newChat._id });
  },
);

export const getAllChats = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ message: "User ID missing" });
      return;
    }

    const chats = await Chat.find({ users: userId }).sort({ updatedAt: -1 });
    const chatWithUserData = await Promise.all(
      chats.map(async (chat) => {
        const otherUserId = chat.users.find((id) => id !== userId);
        if (!otherUserId) return null;

        const unseenCount = await Messages.countDocuments({
          chatId: chat._id,
          sender: { $ne: userId },
          seen: false,
        });
        const user = await fetchOtherUser(otherUserId, req.headers.authorization);
        return {
          user,
          chat: { ...chat.toObject(), unseenCount },
        };
      }),
    );

    res.json({ chats: chatWithUserData.filter((chat) => chat !== null) });
  },
);

export const sendMessage = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const senderId = req.user?._id;
    const chatId = req.body.chatId as string | undefined;
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    const imageFile = req.file;

    if (!senderId) {
      res.status(401).json({ message: "Please log in to send messages" });
      return;
    }
    if (!chatId || (!text && !imageFile)) {
      res.status(400).json({ message: "A chat and message text or image are required" });
      return;
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }
    if (!chat.users.includes(senderId)) {
      res.status(403).json({ message: "You are not a participant in this chat" });
      return;
    }

    let image: { url: string; publicId: string } | undefined;
    if (imageFile) {
      if (imageFile.path && imageFile.filename) {
        image = { url: imageFile.path, publicId: imageFile.filename };
      } else if (imageFile.buffer) {
        if (!isCloudinaryConfigured) {
          res.status(503).json({
            message: "Image uploads are unavailable because image storage is not configured",
          });
          return;
        }
        const uploaded = await saveImage(imageFile.buffer);
        image = { url: uploaded.secure_url, publicId: uploaded.public_id };
      } else {
        res.status(500).json({ message: "The uploaded image could not be processed" });
        return;
      }
    }

    const message = await Messages.create({
      chatId,
      sender: senderId,
      text,
      ...(image ? { image } : {}),
      messageType: image ? "image" : "text",
      seen: false,
    });
    const lastMessageText = image ? "📷 Image" : text;
    chat.lastMessage = { text: lastMessageText, sender: senderId };
    chat.updatedAt = new Date();
    await chat.save();

    const savedMessage = message.toObject();
    emitToUsers(chat.users, "new-message", savedMessage);
    emitToUsers(chat.users, "chat-updated", {
      chatId,
      lastMessage: chat.lastMessage,
      updatedAt: chat.updatedAt,
      sender: senderId,
    });

    res.status(201).json({ message: savedMessage, sender: senderId });
  },
);

export const getMessagesByChat = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;
    const { chatId } = req.params;
    if (typeof chatId !== "string" || !chatId) {
      res.status(400).json({ message: "Chat ID is required" });
      return;
    }
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }
    const isParticipant = chat.users.some((participantId) => participantId === userId);
    if (!isParticipant) {
      res.status(403).json({ message: "You are not a participant in this chat" });
      return;
    }

    const unseenMessages = await Messages.find({
      chatId,
      sender: { $ne: userId },
      seen: false,
    }).select("_id");
    if (unseenMessages.length > 0) {
      await Messages.updateMany(
        { chatId, sender: { $ne: userId }, seen: false },
        { seen: true, seenAt: new Date() },
      );
      emitToUsers(chat.users, "messages-seen", {
        chatId,
        readerId: userId,
        messageIds: unseenMessages.map((message) => message._id.toString()),
      });
    }

    const messages = await Messages.find({ chatId }).sort({ createdAt: 1 });
    const otherUserId = chat.users.find((id) => id !== userId);
    if (!otherUserId) {
      res.status(404).json({ message: "Other user not found" });
      return;
    }
    const user = await fetchOtherUser(otherUserId, req.headers.authorization);
    res.json({ messages, user });
  },
);
