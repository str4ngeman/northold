import { requireLab, labJson } from "@/lib/lab/guard";
import { bytecodeOf, loadArtifact } from "@/lib/lab/paths";

export const dynamic = "force-dynamic";

const CONTRACTS = [
  { name: "NortholdOracle", file: "NortholdOracle.sol" },
  { name: "PositionCard", file: "PositionCard.sol" },
  { name: "NortholdVault", file: "NortholdVault.sol" },
  { name: "NortholdLens", file: "NortholdLens.sol" },
] as const;

export async function GET() {
  const auth = await requireLab();
  if ("error" in auth) return auth.error;
  try {
    const artifacts: Record<string, { abi: unknown[]; bytecode: `0x${string}` }> = {};
    for (const item of CONTRACTS) {
      const art = loadArtifact(item.name, item.file);
      artifacts[item.name] = { abi: art.abi, bytecode: bytecodeOf(art) };
    }
    return labJson({ ok: true, artifacts });
  } catch (err) {
    return labJson({ error: err instanceof Error ? err.message : "Build contracts first" }, 400);
  }
}
