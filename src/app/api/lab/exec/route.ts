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
  if (cmd === "monitor" && extra.includes("--follow")) {
    return labJson({ error: "Use the monitor page instead of --follow" }, 400);
  }

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
        if (runtime.id !== "anvil") {
          if (process.env.DEPLOYER_PRIVATE_KEY) childEnv.PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
          else if (process.env.PRIVATE_KEY) childEnv.PRIVATE_KEY = process.env.PRIVATE_KEY;
        }

        if ((cmd === "warp" || cmd === "sim") && !runtime.capabilities.warp) {
          send({ t: "log", line: `${cmd} is Anvil-only. Switch the app to Local first.` });
          send({ t: "done", code: 1 });
          controller.close();
          return;
        }

        if (cmd === "deploy") {
          extra.push("--rpc", runtime.rpcUrl);
          const tokenSlugs = ["usdt", "usdc", "weth", "wbtc"] as const;
          const tokenAddrs = tokenSlugs
            .map((slug) => [slug, runtime.tokens[slug]?.address] as const)
            .filter((entry): entry is readonly [typeof tokenSlugs[number], `0x${string}`] => Boolean(entry[1]));
          if (runtime.id === "mainnet" || (runtime.id === "sepolia" && tokenAddrs.length === 4)) {
            extra.push("--reuse-tokens");
            for (const [slug, address] of tokenAddrs) extra.push(`--${slug}`, address);
          }
          if (runtime.id === "mainnet" && tokenAddrs.length < 4) {
            send({ t: "log", line: "Mainnet needs USDT/USDC/WETH/WBTC addresses saved first. They are seeded by default." });
            send({ t: "done", code: 1 });
            controller.close();
            return;
          }
          try {
            const { writePlanSeedFromDb } = await import("@/lib/lab/plan-seed");
            const seed = await writePlanSeedFromDb();
            send({
              t: "log",
              line: `deploying to ${runtime.name} (${runtime.rpcUrl})`,
            });
            send({
              t: "log",
              line: `seeding ${seed.plans.length} admin plan(s): ${seed.plans.map((p) => p.slug).join(", ")}`,
            });
          } catch (err) {
            send({
              t: "log",
              line: `plan seed failed: ${err instanceof Error ? err.message : "unknown"}`,
            });
            send({ t: "done", code: 1 });
            controller.close();
            return;
          }
        }

        const child = streamLeague([cmd, ...extra], (line) => send({ t: "log", line }), childEnv);
        child.on("error", (err) => {
          send({ t: "log", line: err.message });
          send({ t: "done", code: 1 });
          controller.close();
        });
        child.on("close", (code) => {
          const finish = async () => {
            if (cmd === "deploy" && (code ?? 1) === 0) {
              try {
                const { syncDeploymentToDb } = await import("@/lib/lab/sync");
                const result = await syncDeploymentToDb(runtime.chainId);
                send({ t: "log", line: `catalog synced  vault=${result.vault}` });
                send({ t: "log", line: `tokens ${result.tokens.join(" · ")}` });
                send({ t: "log", line: `plans ${JSON.stringify(result.plans)}` });
              } catch (err) {
                send({
                  t: "log",
                  line: `catalog sync failed: ${err instanceof Error ? err.message : "unknown"}`,
                });
              }
            }
            send({ t: "done", code: code ?? 1 });
            controller.close();
          };
          void finish();
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
