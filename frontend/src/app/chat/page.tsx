"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";
import { io, type Socket } from "socket.io-client";
import toast from "react-hot-toast";
import Loading from "@/src/components/Loading";
import ConversationSidebar from "@/src/components/chat/ConversationSidebar";
import ConversationView from "@/src/components/chat/ConversationView";
import NewChatDialog from "@/src/components/chat/NewChatDialog";
import type { ChatMessage } from "@/src/components/chat/types";
import {
  chat_service,
  user_service,
  useAppData,
  type Chats,
  type User,
} from "@/src/context/AppContext";

export default function ChatApp() {
  const router = useRouter();
  const { user, chats, loading, isAuth, fetchChats, logoutUser } = useAppData();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [directory, setDirectory] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [messagesChatId, setMessagesChatId] = useState<string | null>(null);
  const [directoryLoaded, setDirectoryLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [mobileConversationOpen, setMobileConversationOpen] = useState(false);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const lastConnectionErrorRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const activeChatIdRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedChatId = activeChatId ?? chats[0]?.chat._id ?? null;
  const activeConversation = chats.find(({ chat }) => chat._id === selectedChatId) ?? null;
  const loadingMessages = Boolean(selectedChatId && messagesChatId !== selectedChatId);
  const loadingDirectory = showNewChat && !directoryLoaded;

  useEffect(() => {
    if (!loading && !isAuth) router.replace("/login");
  }, [isAuth, loading, router]);

  useEffect(() => {
    activeChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  useEffect(() => {
    if (!isAuth) return;
    const token = Cookies.get("token");
    if (!token) return;

    const socket = io(chat_service, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
    socketRef.current = socket;
    socket.on("connect_error", (error) => {
      console.error("Chat connection failed", error);
      setSocketConnected(false);
      if (lastConnectionErrorRef.current !== error.message) {
        toast.error(`Live chat connection failed: ${error.message}`);
        lastConnectionErrorRef.current = error.message;
      }
    });
    socket.on("connect", () => {
      setSocketConnected(true);
      lastConnectionErrorRef.current = null;
    });
    socket.on("disconnect", () => {
      setSocketConnected(false);
    });
    socket.on("new-message", (message: ChatMessage) => {
      if (message.chatId === activeChatIdRef.current) {
        setMessages((current) =>
          current.some((item) => item._id === message._id)
            ? current
            : [...current, message],
        );
        if (message.sender !== user?._id) {
          const currentToken = Cookies.get("token");
          if (currentToken) {
            void axios
              .get<{ messages: ChatMessage[] }>(
                `${chat_service}/api/v1/message/${message.chatId}`,
                { headers: { Authorization: `Bearer ${currentToken}` } },
              )
              .then(({ data }) => {
                setMessages(data.messages);
                setMessagesChatId(message.chatId);
                void fetchChats();
              })
              .catch((error: unknown) => {
                console.error("Unable to mark incoming message as read", error);
                toast.error("Could not update message read status");
              });
          }
        }
      }
      void fetchChats();
    });
    socket.on("chat-updated", () => void fetchChats());
    socket.on(
      "messages-seen",
      (payload: { chatId: string; readerId: string; messageIds: string[] }) => {
        if (payload.chatId !== activeChatIdRef.current || payload.readerId === user?._id) return;
        setMessages((current) =>
          current.map((message) =>
            payload.messageIds.includes(message._id) ? { ...message, seen: true } : message,
          ),
        );
      },
    );
    socket.on(
      "typing",
      (payload: { chatId: string; userId: string; isTyping: boolean }) => {
        if (payload.chatId !== activeChatIdRef.current || payload.userId === user?._id) return;
        setTypingUserId(payload.isTyping ? payload.userId : null);
      },
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [fetchChats, isAuth, user?._id]);

  useEffect(() => {
    if (!selectedChatId || !isAuth) return;
    const token = Cookies.get("token");
    if (!token) return;

    let cancelled = false;
    void axios
      .get<{ messages: ChatMessage[] }>(
        `${chat_service}/api/v1/message/${selectedChatId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      .then(({ data }) => {
        if (!cancelled) {
          setMessages(data.messages);
          setMessagesChatId(selectedChatId);
          void fetchChats();
        }
      })
      .catch((error: unknown) => {
        console.error("Unable to load conversation", error);
        toast.error("Could not load this conversation");
        if (!cancelled) setMessagesChatId(selectedChatId);
      });

    socketRef.current?.emit("join-chat", selectedChatId, (result: { ok: boolean }) => {
      if (!result.ok) toast.error("You do not have access to this conversation");
    });
    return () => {
      cancelled = true;
      socketRef.current?.emit("leave-chat", selectedChatId);
    };
  }, [fetchChats, selectedChatId, isAuth]);

  useEffect(() => {
    if (!showNewChat || !isAuth) return;
    const token = Cookies.get("token");
    if (!token) return;

    let cancelled = false;
    void axios
      .get<User[]>(`${user_service}/api/v1/user/all`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => {
        if (!cancelled) {
          setDirectory(data.filter((person) => person._id !== user?._id));
          setDirectoryLoaded(true);
        }
      })
      .catch((error: unknown) => {
        console.error("Unable to load contacts", error);
        toast.error("Could not load your contacts");
        if (!cancelled) setDirectoryLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuth, showNewChat, user?._id]);

  useEffect(
    () => () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    },
    [],
  );

  const filteredChats = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return chats;
    return chats.filter(
      ({ user: contact, chat }) =>
        contact.name.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        chat.lastMessage?.text?.toLowerCase().includes(query) ||
        chat.latestMessage?.text?.toLowerCase().includes(query),
    );
  }, [chats, search]);

  const selectConversation = useCallback((conversation: Chats) => {
    setMessages([]);
    setMessagesChatId(null);
    setActiveChatId(conversation.chat._id);
    setMobileConversationOpen(true);
    setTypingUserId(null);
  }, []);

  const openNewChat = () => {
    setSearch("");
    setDirectoryLoaded(false);
    setShowNewChat(true);
  };

  const startConversation = useCallback(
    async (contact: User) => {
      const existing = chats.find(({ user: person }) => person._id === contact._id);
      if (existing) {
        selectConversation(existing);
        setShowNewChat(false);
        return;
      }

      const token = Cookies.get("token");
      if (!token) return;
      try {
        const { data } = await axios.post<{ chatId: string }>(
          `${chat_service}/api/v1/chat/new`,
          { otherUserId: contact._id },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        await fetchChats();
        setMessages([]);
        setMessagesChatId(null);
        setActiveChatId(data.chatId);
        setMobileConversationOpen(true);
        setShowNewChat(false);
      } catch (error) {
        console.error("Unable to start conversation", error);
        toast.error("Could not start a conversation");
      }
    },
    [chats, fetchChats, selectConversation],
  );

  const emitTyping = (isTyping: boolean) => {
    if (!selectedChatId) return;
    socketRef.current?.emit("typing", selectedChatId, isTyping);
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    emitTyping(value.trim().length > 0);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), 1200);
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedChatId || (!draft.trim() && !selectedImage)) return;
    const token = Cookies.get("token");
    if (!token) return;

    const formData = new FormData();
    formData.append("chatId", selectedChatId);
    if (draft.trim()) formData.append("text", draft.trim());
    if (selectedImage) formData.append("image", selectedImage);
    setSending(true);
    emitTyping(false);
    try {
      const { data } = await axios.post<{ message: ChatMessage }>(
        `${chat_service}/api/v1/message`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setMessages((current) =>
        current.some((message) => message._id === data.message._id)
          ? current
          : [...current, data.message],
      );
      setDraft("");
      setSelectedImage(null);
      await fetchChats();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? error.message
        : "Could not send your message";
      toast.error(message);
      console.error("Unable to send message", error);
    } finally {
      setSending(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    router.replace("/login");
  };

  const shareInvite = async () => {
    const inviteUrl = new URL("/login", window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join me on Mingle",
          text: "Let's chat on Mingle.",
          url: inviteUrl,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(inviteUrl);
        toast.success("Invite link copied");
      } else {
        toast.error("Sharing is not available in this browser");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Unable to share invite link", error);
      toast.error("Could not share the invite link");
    }
  };

  if (loading) return <Loading />;
  if (!isAuth || !user) return null;

  return (
    <main className="chat-shell">
      <div className="chat-window">
        <ConversationSidebar
          user={user}
          chats={filteredChats}
          totalChatCount={chats.length}
          activeChatId={selectedChatId}
          mobileHidden={mobileConversationOpen}
          search={search}
          onSearchChange={setSearch}
          onSelect={selectConversation}
          onNewChat={openNewChat}
          onInvite={() => void shareInvite()}
          onLogout={handleLogout}
        />
        <ConversationView
          conversation={activeConversation}
          currentUserId={user._id}
          messages={messages}
          loadingMessages={loadingMessages}
          typing={Boolean(typingUserId)}
          socketConnected={socketConnected}
          onReconnect={() => socketRef.current?.connect()}
          mobileOpen={mobileConversationOpen}
          draft={draft}
          selectedImage={selectedImage}
          sending={sending}
          onBack={() => setMobileConversationOpen(false)}
          onNewChat={openNewChat}
          onDraftChange={handleDraftChange}
          onImageChange={setSelectedImage}
          onSend={sendMessage}
        />
      </div>

      {showNewChat && (
        <NewChatDialog
          contacts={directory}
          loading={loadingDirectory}
          onClose={() => setShowNewChat(false)}
          onSelect={(contact) => void startConversation(contact)}
        />
      )}
    </main>
  );
}
