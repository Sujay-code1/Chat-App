"use client";

import { useState } from "react";
import { MessageCircle, Search, X } from "lucide-react";
import type { User } from "@/src/context/AppContext";
import ChatAvatar from "./ChatAvatar";

interface NewChatDialogProps {
  contacts: User[];
  loading: boolean;
  onClose: () => void;
  onSelect: (contact: User) => void;
}

export default function NewChatDialog({
  contacts,
  loading,
  onClose,
  onSelect,
}: NewChatDialogProps) {
  const [search, setSearch] = useState("");
  const filteredContacts = contacts.filter((contact) =>
    `${contact.name} ${contact.email}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="new-chat-modal" role="dialog" aria-modal="true" aria-labelledby="new-chat-title">
        <header>
          <div>
            <span className="eyebrow">MAKE A CONNECTION</span>
            <h2 id="new-chat-title">Start a conversation</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </header>
        <label className="search-box modal-search">
          <Search size={17} />
          <input
            autoFocus
            type="search"
            placeholder="Search people"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search people"
          />
        </label>
        <div className="directory-list">
          {loading ? (
            <div className="directory-empty">Finding people...</div>
          ) : filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <button key={contact._id} onClick={() => onSelect(contact)}>
                <ChatAvatar name={contact.name} />
                <span><strong>{contact.name}</strong><small>{contact.email}</small></span>
                <MessageCircle size={18} />
              </button>
            ))
          ) : (
            <div className="directory-empty">
              {search ? "No people match your search." : "No one else is here yet. Invite a friend to join you."}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
