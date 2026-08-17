import { parseEther, parseUnits, isAddress, type Address, type Abi } from "viem";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

import { ANVIL_PK, ANVIL_RPC } from "@/lib/lab/accounts";
import { requireLab, labJson } from "@/lib/lab/guard";
import { loadArtifact, readDeployment } from "@/lib/lab/paths";
import { getRuntimeNetwork } from "@/lib/network-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireLab();
  if ("error" in auth) return auth.error;

  const runtime = await getRuntimeNetwork();
  if (!runtime.capabilities.faucet) {
    return labJson({ error: "The faucet only mints Anvil mocks. Switch the app to Local first." }, 400);
  }

  const body = (await request.json()) as {
    to?: string;
    eth?: string;
    tokens?: Partial<Record<"usdt" | "usdc" | "weth" | "wbtc", string>>;
  };
  if (!body.to || !isAddress(body.to)) {
    return labJson({ error: "Pass a valid destination address" }, 400);
  }
  const to = body.to as Address;
  const deployment = readDeployment(31337);
  if (!deployment) {
    return labJson({ error: "Deploy the vault on Anvil first" }, 400);
  }

  const account = privateKeyToAccount(ANVIL_PK);
  const chain = { ...foundry, rpcUrls: { default: { http: [ANVIL_RPC] } } };
  const wallet = createWalletClient({ account, chain, transport: http(ANVIL_RPC) });
  const publicClient = createPublicClient({ chain, transport: http(ANVIL_RPC) });
  const mockAbi = loadArtifact("MockERC20", "MockERC20.sol").abi as Abi;
  const sent: string[] = [];

  async function send(hash: Promise<`0x${string}`>) {
    const h = await hash;
    await publicClient.waitForTransactionReceipt({ hash: h });
    return h;
  }

  try {
    if (body.eth && Number(body.eth) > 0) {
      await send(
        wallet.sendTransaction({
          account,
          chain,
          to,
          value: parseEther(body.eth),
        }),
      );
      sent.push(`${body.eth} ETH`);
    }

    const tokenMap = {
      usdt: { address: deployment.contracts.usdt, decimals: 6 },
      usdc: { address: deployment.contracts.usdc, decimals: 6 },
      weth: { address: deployment.contracts.weth, decimals: 18 },
      wbtc: { address: deployment.contracts.wbtc, decimals: 8 },
    } as const;

    for (const [symbol, spec] of Object.entries(tokenMap)) {
      const amount = body.tokens?.[symbol as keyof typeof tokenMap];
      if (!amount || Number(amount) <= 0) continue;
      await send(
        wallet.writeContract({
          account,
          chain,
          address: spec.address,
          abi: mockAbi,
          functionName: "mint",
          args: [to, parseUnits(amount, spec.decimals)],
        }),
      );
      sent.push(`${amount} ${symbol.toUpperCase()}`);
    }

    if (!sent.length) {
      return labJson({ error: "Nothing to send" }, 400);
    }
    return labJson({ ok: true, to, sent });
  } catch (err) {
    return labJson({ error: err instanceof Error ? err.message : "fund failed" }, 500);
  }
}
