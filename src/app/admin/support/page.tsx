"use client";

import { useEffect, useState } from "react";

import { LetterButton } from "@/components/kinetic/letter-button";

type Thread = {
  id: string;
  status: string;
  lastPreview: string;
  user: { email?: string | null; name?: string | null; address?: string | null } | null;
};
type Msg = { id: string; sender: string; body: string };

export default function AdminSupport() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");

  async function loadThreads() {
    const res = await fetch("/api/admin/support");
    setThreads((await res.json()).threads ?? []);
  }

  async function loadThread(id: string) {
    setActive(id);
    const res = await fetch(`/api/admin/support/${id}`);
    setMessages((await res.json()).messages ?? []);
  }

  useEffect(() => {
    void loadThreads();
    const id = window.setInterval(() => void loadThreads(), 5000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => void loadThread(active), 4000);
    return () => window.clearInterval(id);
  }, [active]);

  async function reply() {
    if (!active || !text.trim()) return;
    await fetch(`/api/admin/support/${active}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    setText("");
    await loadThread(active);
    await loadThreads();
  }

  return (
    <div>
      <p className="label">Support</p>
      <h1 className="h2 hero-copy">Inbox</h1>
      <div className="admin-support">
        <div className="glass" style={{ padding: "1rem" }}>
          {threads.map((t) => (
            <button
              key={t.id}
              type="button"
              className={active === t.id ? "is-on" : ""}
              style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: 0, color: "inherit", padding: "0.8rem 0", cursor: "pointer" }}
              onClick={() => void loadThread(t.id)}
            >
              <strong>{t.user?.name || t.user?.email || t.user?.address || "User"}</strong>
              <span className="label" style={{ display: "block" }}>{t.lastPreview}</span>
            </button>
          ))}
        </div>
        <div className="glass" style={{ padding: "1rem", display: "flex", flexDirection: "column", minHeight: 360 }}>
          <div className="chat-log" style={{ flex: 1 }}>
            {messages.map((m) => (
              <p key={m.id} className={`chat-msg chat-msg--${m.sender}`}>{m.body}</p>
            ))}
          </div>
          {active && (
            <>
              <form
                className="chat-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void reply();
                }}
              >
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply" />
                <LetterButton label="Send" type="submit" />
              </form>
              <div style={{ marginTop: "0.75rem" }}>
                <LetterButton
                  label="Close thread"
                  variant="ghost"
                  onClick={() => {
                    void fetch(`/api/admin/support/${active}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "closed" }),
                    }).then(() => void loadThreads());
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
