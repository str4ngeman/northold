"use client";

import { useEffect, useRef, useState } from "react";

import { LetterButton } from "@/components/kinetic/letter-button";
import { useCatalog } from "@/hooks/use-catalog";
import { useSession } from "@/hooks/use-session";

type Msg = { id: string; sender: "user" | "admin"; body: string; createdAt: string };

export function ChatWidget() {
  const { user } = useSession();
  const catalog = useCatalog();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/support");
    if (!res.ok) return;
    const data = (await res.json()) as { messages: Msg[] };
    setMessages(data.messages);
  }

  useEffect(() => {
    if (!open || !user) return;
    void load();
    const id = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(id);
  }, [open, user]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  if (!user || catalog?.settings.supportEnabled === false) return null;

  async function send() {
    const body = text.trim();
    if (!body) return;
    setText("");
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) await load();
  }

  return (
    <div className="chat-dock">
      {open && (
        <div className="glass chat-panel" data-lenis-prevent>
          <p className="label">Support</p>
          <div className="chat-log">
            {messages.length === 0 && <p className="body">Ask anything about your vault.</p>}
            {messages.map((m) => (
              <p key={m.id} className={`chat-msg chat-msg--${m.sender}`}>
                {m.body}
              </p>
            ))}
            <div ref={bottom} />
          </div>
          <form
            className="chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message" />
            <LetterButton label="Send" type="submit" />
          </form>
        </div>
      )}
      <LetterButton label={open ? "Close chat" : "Support"} variant="ghost" onClick={() => setOpen((v) => !v)} />
    </div>
  );
}
