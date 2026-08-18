import { isAddress } from "viem";

import { requireLab, labJson } from "@/lib/lab/guard";
import { saveWalletDeployment } from "@/lib/lab/sync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireLab();
  if ("error" in auth) return auth.error;
  const body = (await request.json()) as {
    deployer?: string;
    chainId?: number;
    rpc?: string;
    contracts?: {
      vault?: string;
      card?: string;
      oracle?: string;
      lens?: string;
      usdt?: string;
      usdc?: string;
      weth?: string;
      wbtc?: string;
    };
    plans?: { id: number; slug: string }[];
  };

  const contracts = body.contracts;
  const required = ["vault", "card", "oracle", "lens", "usdt", "usdc", "weth", "wbtc"] as const;
  if (!body.deployer || !isAddress(body.deployer) || !body.chainId || !contracts) {
    return labJson({ error: "Deployer, chainId, and contracts are required" }, 400);
  }
  for (const key of required) {
    if (!contracts[key] || !isAddress(contracts[key]!)) {
      return labJson({ error: `${key} is not a valid address` }, 400);
    }
  }

  try {
    const result = await saveWalletDeployment({
      deployer: body.deployer,
      chainId: body.chainId,
      rpc: body.rpc,
      contracts: {
        vault: contracts.vault as `0x${string}`,
        card: contracts.card as `0x${string}`,
        oracle: contracts.oracle as `0x${string}`,
        lens: contracts.lens as `0x${string}`,
        usdt: contracts.usdt as `0x${string}`,
        usdc: contracts.usdc as `0x${string}`,
        weth: contracts.weth as `0x${string}`,
        wbtc: contracts.wbtc as `0x${string}`,
      },
      plans: Array.isArray(body.plans) ? body.plans : [],
    });
    return labJson({ ok: true, ...result });
  } catch (err) {
    return labJson({ error: err instanceof Error ? err.message : "Save failed" }, 500);
  }
}
