import {
  LogOut,
  MessageCircle,
  Search,
  Share2,
  UserPlus,
  X,
} from "lucide-react";
import type { Chats, User } from "@/src/context/AppContext";
import ChatAvatar from "./ChatAvatar";

const formatTime = (date: string) =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
    new Date(date),
  );

const formatListTime = (date?: string) => {
  if (!date) return "";
  const messageDate = new Date(date);
  if (messageDate.toDateString() === new Date().toDateString()) return formatTime(date);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    messageDate,
  );
};

interface ConversationSidebarProps {
  user: User;
  chats: Chats[];
  totalChatCount: number;
  activeChatId: string | null;
  mobileHidden: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (conversation: Chats) => void;
  onNewChat: () => void;
  onInvite: () => void;
  onLogout: () => void;
}

export default function ConversationSidebar({
  user,
  chats,
  totalChatCount,
  activeChatId,
  mobileHidden,
  search,
  onSearchChange,
  onSelect,
  onNewChat,
  onInvite,
  onLogout,
}: ConversationSidebarProps) {
  return (
    <aside
      className={`sidebar ${mobileHidden ? "sidebar-hidden-mobile" : ""}`}
      aria-label="Conversations"
    >
      <header className="sidebar-topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><MessageCircle size={19} fill="currentColor" /></div>
          <span>mingle<span className="brand-period">.</span></span>
        </div>
        <div className="topbar-actions">
          <button className="icon-button" onClick={onNewChat} aria-label="Start a new chat">
            <UserPlus size={19} />
          </button>
          <button
            className="icon-button"
            onClick={onInvite}
            aria-label="Invite a friend"
            title="Invite a friend"
          >
            <Share2 size={18} />
          </button>
          <button className="icon-button" onClick={onLogout} aria-label="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <section className="profile-strip">
        <ChatAvatar name={user.name} size="large" />
        <div className="profile-copy">
          <strong>{user.name}</strong>
          <span>Your account</span>
        </div>
      </section>

      <div className="conversation-heading">
        <div>
          <span className="eyebrow">YOUR SPACE</span>
          <h1>Messages <span>{totalChatCount.toString().padStart(2, "0")}</span></h1>
        </div>
        <button className="compose-button" onClick={onNewChat} aria-label="New message">
          <MessageCircle size={17} />
        </button>
      </div>

      <label className="search-box">
        <Search size={17} />
        <input
          type="search"
          placeholder="Search conversations"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Search conversations"
        />
        {search && (
          <button type="button" onClick={() => onSearchChange("")} aria-label="Clear search">
            <X size={15} />
          </button>
        )}
      </label>

      <div className="conversation-list">
        {chats.length > 0 ? (
          chats.map(({ user: contact, chat }) => {
            const lastMessage = chat.lastMessage ?? chat.latestMessage;
            return (
              <button
                key={chat._id}
                onClick={() => onSelect({ user: contact, chat })}
                className={`conversation-item ${activeChatId === chat._id ? "conversation-active" : ""}`}
              >
                <ChatAvatar name={contact.name} />
                <span className="conversation-copy">
                  <span className="conversation-title-row">
                    <strong>{contact.name}</strong>
                    <time>{formatListTime(chat.updatedAt)}</time>
                  </span>
                  <span className="conversation-preview-row">
                    <span className="conversation-preview">{lastMessage?.text || "Say hello 👋"}</span>
                    {chat.unseenCount > 0 && (
                      <span className="unread-badge">{chat.unseenCount}</span>
                    )}
                  </span>
                </span>
              </button>
            );
          })
        ) : (
          <div className="empty-list">
            <div className="empty-icon"><MessageCircle size={21} /></div>
            <strong>{search ? "No matches found" : "Your chats start here"}</strong>
            <p>{search ? "Try another name or message." : "Find someone and say hello."}</p>
            {!search && <button onClick={onNewChat}>Start a conversation</button>}
          </div>
        )}
      </div>

      <footer className="sidebar-footer">
        <span className="secure-dot" />
        <span>Your conversations are yours</span>
      </footer>
    </aside>
  );
}
