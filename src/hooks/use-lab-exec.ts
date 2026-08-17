"use client";

import { useCallback, useState } from "react";

type ExecEvent = { t: "log"; line: string } | { t: "done"; code: number };

export function useLabExec() {
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [code, setCode] = useState<number | null>(null);

  const run = useCallback(async (cmd: string, args: string[] = []) => {
    setLines([]);
    setCode(null);
    setRunning(true);
    try {
      const res = await fetch("/api/lab/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd, args }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setLines([data.error ?? `HTTP ${res.status}`]);
        setCode(1);
        return 1;
      }
      if (!res.body) {
        setLines(["No response body"]);
        setCode(1);
        return 1;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let exit = 1;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const chunks = buf.split("\n\n");
        buf = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const row = chunk.split("\n").find((l) => l.startsWith("data: "));
          if (!row) continue;
          const ev = JSON.parse(row.slice(6)) as ExecEvent;
          if (ev.t === "log") setLines((prev) => [...prev, ev.line]);
          if (ev.t === "done") exit = ev.code;
        }
      }
      setCode(exit);
      return exit;
    } catch (err) {
      setLines((prev) => [...prev, err instanceof Error ? err.message : "exec failed"]);
      setCode(1);
      return 1;
    } finally {
      setRunning(false);
    }
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setCode(null);
  }, []);

  return { lines, running, code, run, clear };
}
