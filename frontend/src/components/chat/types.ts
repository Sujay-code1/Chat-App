import type { Chats, User } from "@/src/context/AppContext";

export interface ChatMessage {
  _id: string;
  chatId: string;
  sender: string;
  text?: string;
  image?: { url: string; publicId: string };
  messageType: "text" | "image";
  seen: boolean;
  createdAt: string;
}

export interface Conversation extends Chats {
  user: User;
}
