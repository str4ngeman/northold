import { isLabCommand, streamLeague } from "@/lib/lab/exec";
import { requireLab, labJson } from "@/lib/lab/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireLab();
  if ("error" in auth) return auth.error;

  const body = (await request.json()) as { cmd?: string; args?: unknown };
  const cmd = body.cmd ?? "";
  if (!isLabCommand(cmd)) {
    return labJson({ error: `Unknown command: ${cmd}` }, 400);
  }
  const extra = Array.isArray(body.args) ? body.args.map(String).filter(Boolean) : [];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const go = async () => {
        const { getRuntimeNetwork } = await import("@/lib/network-store");
        const runtime = await getRuntimeNetwork();
        const childEnv: Record<string, string | undefined> = {
          RPC_URL: runtime.rpcUrl,
        };

        const child = streamLeague([cmd, ...extra], (line) => send({ t: "log", line }), childEnv);
        child.on("error", (err) => {
          send({ t: "log", line: err.message });
          send({ t: "done", code: 1 });
          controller.close();
        });
        child.on("close", (code) => {
          send({ t: "done", code: code ?? 1 });
          controller.close();
        });
      };

      void go();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
