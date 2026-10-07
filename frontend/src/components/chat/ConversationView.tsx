"use client";

import { useEffect, useRef, type FormEvent } from "react";
import { ArrowLeft, Check, CheckCheck, MessageCircle, MoreVertical } from "lucide-react";
import ChatAvatar from "./ChatAvatar";
import ChatComposer from "./ChatComposer";
import type { ChatMessage } from "./types";
import type { Chats } from "@/src/context/AppContext";

const formatTime = (date: string) =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
    new Date(date),
  );

interface ConversationViewProps {
  conversation: Chats | null;
  currentUserId: string;
  messages: ChatMessage[];
  loadingMessages: boolean;
  typing: boolean;
  mobileOpen: boolean;
  socketConnected: boolean;
  draft: string;
  selectedImage: File | null;
  sending: boolean;
  onBack: () => void;
  onReconnect: () => void;
  onDraftChange: (value: string) => void;
  onImageChange: (file: File | null) => void;
  onSend: (event: FormEvent<HTMLFormElement>) => void;
}

export default function ConversationView({
  conversation,
  currentUserId,
  messages,
  loadingMessages,
  typing,
  mobileOpen,
  socketConnected,
  draft,
  selectedImage,
  sending,
  onBack,
  onReconnect,
  onDraftChange,
  onImageChange,
  onSend,
}: ConversationViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  return (
    <section className={`conversation-panel ${mobileOpen ? "conversation-mobile-open" : ""}`}>
      {conversation ? (
        <>
          <header className="conversation-topbar">
            <button className="icon-button mobile-back" onClick={onBack} aria-label="Back to conversations">
              <ArrowLeft size={19} />
            </button>
            <ChatAvatar name={conversation.user.contactName || conversation.user.name} />
            <div className="contact-heading">
              <strong>{conversation.user.contactName || conversation.user.name}</strong>
              <span>{typing ? "typing..." : "direct conversation"}</span>
            </div>
            <div className="contact-actions">
              {!socketConnected && (
                <button className="reconnect-button" onClick={onReconnect}>
                  Reconnect
                </button>
              )}
              <span className={`live-status ${socketConnected ? "live-status-on" : ""}`}>
                <i /> {socketConnected ? "Live" : "Offline"}
              </span>
              <button className="icon-button" aria-label="More conversation options">
                <MoreVertical size={19} />
              </button>
            </div>
          </header>

          <div className="message-stage" ref={scrollRef}>
            <div className="chat-day-label"><span>TODAY</span></div>
            {loadingMessages ? (
              <div className="message-loading"><span /> Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="conversation-empty">
                <div className="empty-chat-art"><MessageCircle size={27} /></div>
                <strong>This is the beginning</strong>
                <p>Send a message to start the conversation.</p>
              </div>
            ) : (
              <div className="message-list">
                {messages.map((message) => {
                  const isMine = message.sender === currentUserId;
                  return (
                    <article
                      key={message._id}
                      className={`message-row ${isMine ? "message-row-mine" : ""}`}
                    >
                      <div className={`message-bubble ${isMine ? "message-mine" : "message-theirs"}`}>
                        {message.image && (
                          <a href={message.image.url} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img className="message-image" src={message.image.url} alt="Shared image" />
                          </a>
                        )}
                        {message.text && <p>{message.text}</p>}
                        <div className="message-meta">
                          <time>{formatTime(message.createdAt)}</time>
                          {isMine && (
                            message.seen
                              ? <CheckCheck className="read-check" size={15} aria-label="Read" />
                              : message.deliveredAt
                                ? <CheckCheck className="delivered-check" size={15} aria-label="Delivered" />
                                : <Check size={14} aria-label="Sent" />
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            {typing && <div className="typing-indicator"><i /><i /><i /></div>}
          </div>
          <ChatComposer
            draft={draft}
            selectedImage={selectedImage}
            sending={sending}
            onDraftChange={onDraftChange}
            onImageChange={onImageChange}
            onSubmit={onSend}
          />
        </>
      ) : (
        <div className="welcome-panel">
          <div className="welcome-orbit orbit-one" />
          <div className="welcome-orbit orbit-two" />
          <div className="welcome-icon"><MessageCircle size={34} /></div>
          <span className="eyebrow">A LITTLE CLOSER</span>
          <h2>Good conversations<br />make good days.</h2>
          <p>Choose a conversation or find someone new to talk to.</p>
        </div>
      )}
    </section>
  );
}
