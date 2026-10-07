import { useState, type FormEvent } from "react";
import {
  Check,
  Pencil,
  LogOut,
  MessageCircle,
  Search,
  Share2,
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
  onlineUserIds: Set<string>;
  totalChatCount: number;
  activeChatId: string | null;
  mobileHidden: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (conversation: Chats) => void;
  onRenameContact: (chatId: string, name: string) => Promise<boolean>;
  onInvite: () => void;
  onLogout: () => void;
}

export default function ConversationSidebar({
  user,
  chats,
  onlineUserIds,
  totalChatCount,
  activeChatId,
  mobileHidden,
  search,
  onSearchChange,
  onSelect,
  onRenameContact,
  onInvite,
  onLogout,
}: ConversationSidebarProps) {
  const [renaming, setRenaming] = useState<Chats | null>(null);
  const [contactName, setContactName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const openRename = (conversation: Chats) => {
    setRenaming(conversation);
    setContactName(conversation.user.contactName || conversation.user.name);
  };

  const saveContactName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!renaming) return;
    setSavingName(true);
    const saved = await onRenameContact(renaming.chat._id, contactName);
    setSavingName(false);
    if (saved) setRenaming(null);
  };

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
          <h1>Friends <span>{totalChatCount.toString().padStart(2, "0")}</span></h1>
        </div>
      </div>

      <label className="search-box">
        <Search size={17} />
        <input
          type="search"
          placeholder="Search friends or messages"
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
              <div
                key={chat._id}
                className={`conversation-row ${activeChatId === chat._id ? "conversation-active" : ""}`}
              >
                <button
                  onClick={() => onSelect({ user: contact, chat })}
                  className="conversation-item"
                >
                  <ChatAvatar
                    name={contact.contactName || contact.name}
                    online={onlineUserIds.has(contact._id)}
                  />
                  <span className="conversation-copy">
                    <span className="conversation-title-row">
                      <strong>{contact.contactName || contact.name}</strong>
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
                <button
                  type="button"
                  className="friend-name-edit"
                  onClick={() => openRename({ user: contact, chat })}
                  aria-label={`Edit ${contact.contactName || contact.name}'s saved name`}
                  title="Save a custom friend name"
                >
                  <Pencil size={14} />
                </button>
              </div>
            );
          })
        ) : (
          <div className="empty-list">
            <div className="empty-icon"><MessageCircle size={21} /></div>
            <strong>{search ? "No matches found" : "Your friends will appear here"}</strong>
            <p>
              {search
                ? "Try another name or message."
                : "Invite a friend with your link and they’ll appear here when they join."}
            </p>
          </div>
        )}
      </div>

      {renaming && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingName) setRenaming(null);
          }}
        >
          <form className="modal-panel rename-friend-modal" onSubmit={saveContactName}>
            <header>
              <div>
                <span className="eyebrow">YOUR FRIEND LIST</span>
                <h2>Save a friend name</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setRenaming(null)}
                aria-label="Close"
                disabled={savingName}
              >
                <X size={19} />
              </button>
            </header>
            <label className="rename-friend-label" htmlFor="friend-name">
              Choose a name only you will see
            </label>
            <input
              id="friend-name"
              className="rename-friend-input"
              autoFocus
              maxLength={40}
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
            />
            <div className="rename-friend-actions">
              <button
                type="button"
                className="rename-reset-button"
                onClick={() => setContactName("")}
                disabled={savingName}
              >
                Use account name
              </button>
              <button type="submit" className="rename-save-button" disabled={savingName}>
                <Check size={16} /> {savingName ? "Saving..." : "Save name"}
              </button>
            </div>
          </form>
        </div>
      )}

      <footer className="sidebar-footer">
        <span className="secure-dot" />
        <span>Your conversations are yours</span>
      </footer>
    </aside>
  );
}
