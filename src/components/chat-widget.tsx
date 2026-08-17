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
            className="w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-[1.75rem] bg-[#11161f] p-4 shadow-2xl ring-1 ring-white/10"
          >
            <p className="text-sm font-semibold">Need a bearing?</p>
            <p className="text-xs text-[var(--ink-3)]">Ask about locks, claims, or early exit.</p>
            <div className="mt-3 flex max-h-56 flex-col gap-2 overflow-auto">
              {messages.length === 0 && (
                <p className="rounded-2xl bg-white/5 px-3 py-2 text-sm text-[var(--ink-2)]">
                  Try: “What happens if I claim early?”
                </p>
              )}
              {messages.map((m) => (
                <p
                  key={m.id}
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                    m.sender === "user" ? "self-end bg-[var(--light)]/15" : "self-start bg-white/6"
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
                className="h-11 flex-1 rounded-full bg-white/5 px-4 text-sm outline-none ring-1 ring-white/10"
              />
              <button type="submit" className="grid size-11 place-items-center rounded-full bg-[var(--light)] text-[#16120a]">
                <Send className="size-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid size-14 place-items-center rounded-full bg-[var(--light)] text-[#16120a] shadow-[0_12px_30px_-10px_rgba(217,181,106,.8)] transition-transform active:scale-95"
        aria-label={open ? "Close chat" : "Open support"}
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </button>
    </div>
  );
}
