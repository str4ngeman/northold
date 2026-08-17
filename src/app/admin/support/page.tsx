"use client";

import { useEffect, useState } from "react";

import { AdminModal } from "@/components/admin/modal";
import { AdminPage, AdminTable, EmptyRow, StatusPill, Td, Th } from "@/components/admin/ui";
import { CtaButton } from "@/components/ui/cta-button";

type Thread = {
  id: string;
  status: string;
  lastPreview: string;
  user: { email?: string | null; name?: string | null; address?: string | null } | null;
};
type Msg = { id: string; sender: string; body: string };

export default function AdminSupport() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadThreads() {
    const res = await fetch("/api/admin/support");
    setThreads((await res.json()).threads ?? []);
  }

  async function openThread(thread: Thread) {
    setActive(thread);
    const res = await fetch(`/api/admin/support/${thread.id}`);
    setMessages((await res.json()).messages ?? []);
  }

  useEffect(() => {
    void loadThreads();
    const id = window.setInterval(() => void loadThreads(), 8000);
    return () => window.clearInterval(id);
  }, []);

  async function reply() {
    if (!active || !text.trim()) return;
    setBusy(true);
    await fetch(`/api/admin/support/${active.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    setText("");
    setBusy(false);
    await openThread(active);
    await loadThreads();
  }

  async function closeThread() {
    if (!active) return;
    await fetch(`/api/admin/support/${active.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    setActive(null);
    await loadThreads();
  }

  return (
    <AdminPage kicker="Support" title="Inbox" description="Open a conversation to reply. The list stays quiet until you pick one.">
      <AdminTable>
        <thead>
          <tr>
            <Th>From</Th>
            <Th>Preview</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {threads.length === 0 && <EmptyRow cols={3} text="No support threads yet." />}
          {threads.map((t) => (
            <tr
              key={t.id}
              className="cursor-pointer border-t border-white/6 hover:bg-white/[0.03]"
              onClick={() => void openThread(t)}
            >
              <Td className="font-medium">{t.user?.name || t.user?.email || t.user?.address || "User"}</Td>
              <Td className="max-w-[320px] truncate text-[var(--ink-2)]">{t.lastPreview || "—"}</Td>
              <Td>
                <StatusPill on={t.status === "open"} label={t.status === "open" ? "Open" : "Closed"} />
              </Td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <AdminModal
        open={Boolean(active)}
        onOpenChange={(next) => !next && setActive(null)}
        title={active?.user?.name || active?.user?.email || "Conversation"}
        description="Replies show up in the user’s chat bubble."
      >
        <div className="flex max-h-64 flex-col gap-2 overflow-auto rounded-2xl bg-black/20 p-3">
          {messages.length === 0 && <p className="text-sm text-[var(--ink-3)]">No messages yet.</p>}
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
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void reply();
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Reply"
            className="h-11 flex-1 rounded-full bg-white/5 px-4 text-sm outline-none ring-1 ring-white/10"
          />
          <CtaButton type="submit" disabled={busy} className="h-11 px-5">
            Send
          </CtaButton>
        </form>
        <CtaButton variant="ghost" className="h-10" onClick={() => void closeThread()}>
          Close thread
        </CtaButton>
      </AdminModal>
    </AdminPage>
  );
}
