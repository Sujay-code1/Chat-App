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

export const createInvitedChat = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const recipientId = req.user?._id;
    const inviterId =
      typeof req.body.otherUserId === "string" ? req.body.otherUserId : "";

    if (!recipientId || !inviterId || recipientId === inviterId) {
      res.status(400).json({ message: "A valid inviter is required" });
      return;
    }

    let chat = await Chat.findOne({
      users: { $all: [recipientId, inviterId], $size: 2 },
    });
    if (!chat) {
      chat = await Chat.create({ users: [recipientId, inviterId] });
    }

    let welcomeMessage = await Messages.findOne({
      chatId: chat._id,
      kind: "invite-welcome",
    });

    if (!welcomeMessage) {
      try {
        welcomeMessage = await Messages.create({
          chatId: chat._id,
          sender: inviterId,
          text: "Welcome to Mingle! Your friend is happy you're here.",
          messageType: "text",
          kind: "invite-welcome",
          deliveredAt: null,
          seen: false,
        });
        chat.lastMessage = {
          text: welcomeMessage.text ?? "",
          sender: inviterId,
        };
        await chat.save();
      } catch (error) {
        if (
          !error ||
          typeof error !== "object" ||
          !("code" in error) ||
          error.code !== 11000
        ) {
          throw error;
        }
        welcomeMessage = await Messages.findOne({
          chatId: chat._id,
          kind: "invite-welcome",
        });
        if (!welcomeMessage) throw error;
      }
    }

    emitToUsers([recipientId, inviterId], "chat-updated", {
      chatId: chat._id.toString(),
      lastMessage: chat.lastMessage,
      updatedAt: chat.updatedAt,
    });
    if (welcomeMessage) {
      emitToUsers([recipientId, inviterId], "new-message", welcomeMessage.toObject());
    }

    res.status(200).json({
      message: "Inviter added to your friend list",
      chatId: chat._id,
    });
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
          user: {
            ...user,
            contactName: chat.contactNames.find((entry) => entry.userId === userId)?.name,
          },
          chat: { ...chat.toObject(), unseenCount },
        };
      }),
    );

    res.json({ chats: chatWithUserData.filter((chat) => chat !== null) });
  },
);

export const updateContactName = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;
    const { chatId } = req.params;
    const name = typeof req.body.name === "string" ? req.body.name.trim() : null;

    if (!userId) {
      res.status(401).json({ message: "Please log in to rename this contact" });
      return;
    }
    if (typeof chatId !== "string" || !chatId) {
      res.status(400).json({ message: "Chat ID is required" });
      return;
    }
    if (name === null || name.length > 40) {
      res.status(400).json({ message: "A contact name of up to 40 characters is required" });
      return;
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      res.status(404).json({ message: "Chat not found" });
      return;
    }
    if (!chat.users.includes(userId)) {
      res.status(403).json({ message: "You are not a participant in this chat" });
      return;
    }

    chat.contactNames = chat.contactNames.filter((entry) => entry.userId !== userId);
    if (name) chat.contactNames.push({ userId, name });
    await chat.save();

    res.json({ contactName: name || null });
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

    const undeliveredMessages = await Messages.find({
      chatId,
      sender: { $ne: userId },
      deliveredAt: null,
    }).select("_id sender");
    if (undeliveredMessages.length > 0) {
      const deliveredAt = new Date();
      await Messages.updateMany(
        { _id: { $in: undeliveredMessages.map((message) => message._id) } },
        { $set: { deliveredAt } },
      );
      const deliveredBySender = new Map<string, string[]>();
      for (const message of undeliveredMessages) {
        const messageIds = deliveredBySender.get(message.sender) ?? [];
        messageIds.push(message._id.toString());
        deliveredBySender.set(message.sender, messageIds);
      }
      for (const [senderId, messageIds] of deliveredBySender) {
        emitToUsers([senderId], "messages-delivered", {
          chatId,
          recipientId: userId,
          messageIds,
        });
      }
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
    res.json({
      messages,
      user: {
        ...user,
        contactName: chat.contactNames.find((entry) => entry.userId === userId)?.name,
      },
    });
  },
);

export const getPendingMessages = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const chats = await Chat.find({ users: userId }).select("_id");
    const messages = await Messages.find({
      chatId: { $in: chats.map((chat) => chat._id) },
      sender: { $ne: userId },
      deliveredAt: null,
    }).sort({ createdAt: 1 });

    res.json({ messages });
  },
);
