"use client";

import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import { ImagePlus, Paperclip, Send, Smile, X } from "lucide-react";
import toast from "react-hot-toast";

interface ChatComposerProps {
  draft: string;
  selectedImage: File | null;
  sending: boolean;
  onDraftChange: (value: string) => void;
  onImageChange: (file: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function ChatComposer({
  draft,
  selectedImage,
  sending,
  onDraftChange,
  onImageChange,
  onSubmit,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!selectedImage) {
      if (previewRef.current) previewRef.current.src = "";
      return;
    }
    const previewUrl = URL.createObjectURL(selectedImage);
    if (previewRef.current) previewRef.current.src = previewUrl;
    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedImage]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <div className="composer-area">
      {selectedImage && (
        <div className="image-attachment-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={previewRef} alt="Selected image preview" />
          <span>{selectedImage.name}</span>
          <button type="button" onClick={() => onImageChange(null)} aria-label="Remove image">
            <X size={15} />
          </button>
        </div>
      )}
      <form className="composer" onSubmit={onSubmit}>
        <button
          type="button"
          className="composer-action"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach an image"
        >
          <Paperclip size={20} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
              toast.error("Images must be smaller than 5 MB");
              event.target.value = "";
              return;
            }
            onImageChange(file);
            event.target.value = "";
          }}
        />
        <textarea
          rows={1}
          placeholder="Write a message..."
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Write a message"
        />
        <button
          type="button"
          className="composer-action emoji-action"
          aria-label="Insert a smile"
          onClick={() => onDraftChange(`${draft}🙂`)}
        >
          <Smile size={19} />
        </button>
        <button
          type="submit"
          className="send-button"
          disabled={sending || (!draft.trim() && !selectedImage)}
          aria-label="Send message"
        >
          <Send size={17} fill="currentColor" />
        </button>
      </form>
      <div className="composer-hint"><ImagePlus size={13} /> Share a moment, keep the conversation going.</div>
    </div>
  );
}
