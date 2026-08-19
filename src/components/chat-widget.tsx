"use client";

import { MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

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
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3 lg:bottom-6 lg:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className="w-[min(360px,calc(100vw-2rem))] overflow-hidden border border-[var(--rule)] bg-[var(--slate)] p-4 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]"
          >
            <p className="tag">Pit office</p>
            <p className="mt-2 text-[0.85rem] text-bone-2">Ask about terms, lifting, or abandoning a shaft.</p>
            <div className="mt-3 flex max-h-56 flex-col gap-2 overflow-auto">
              {messages.length === 0 && (
                <p className="border border-[var(--rule)] px-3 py-2 text-sm text-bone-2">
                  Try: “What happens if I lift early?”
                </p>
              )}
              {messages.map((m) => (
                <p
                  key={m.id}
                  className={`max-w-[90%] px-3 py-2 text-sm ${
                    m.sender === "user"
                      ? "self-end border border-flux/40 text-bone"
                      : "self-start border border-[var(--rule)] bg-[var(--pitch)] text-bone-2"
                  }`}
                >
                  {m.body}
                </p>
              ))}
              <div ref={bottom} />
            </div>
            <form
              className="mt-3 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Message"
                className="h-11 min-w-0 flex-1 border border-[var(--rule)] bg-[var(--pitch)] px-3 text-sm outline-none focus:border-flux"
              />
              <button type="submit" className="grid size-11 shrink-0 place-items-center bg-bone text-[#0b0b0c] transition-colors hover:bg-flux">
                <Send className="size-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid size-12 place-items-center border border-[var(--rule)] bg-bone text-[#0b0b0c] transition-colors hover:bg-flux active:scale-95"
        aria-label={open ? "Close chat" : "Open support"}
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </button>
    </div>
  );
}
