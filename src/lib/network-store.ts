import { isAddress, type Address } from "viem";

import { connectDb } from "@/lib/db";
import { readDeployment, type Deployment } from "@/lib/lab/paths";
import { Settings } from "@/lib/models/settings";
import { Plan } from "@/lib/models/plan";
import {
  DEFAULT_NETWORK_ID,
  NETWORKS,
  defaultTokenMap,
  emptyProfile,
  isBlockchainNetworkPinned,
  isNetworkId,
  networkIdFromChainId,
  serverRpcUrl,
  serverWsUrl,
  type NetworkId,
  type NetworkProfile,
  type NetworkTokenMap,
} from "@/lib/networks";
import type { ProtocolConfig } from "@/lib/types";

export type RuntimeNetwork = {
  id: NetworkId;
  name: string;
  shortLabel: string;
  mode: "lab" | "test" | "live";
  chainId: number;
  rpcUrl: string;
  wsUrl?: string;
  explorerUrl: string;
  capabilities: { warp: boolean; faucet: boolean; deployMocks: boolean };
  profile: NetworkProfile;
  protocol: ProtocolConfig | null;
  tokens: NetworkTokenMap;
};

type SettingsDoc = {
  activeNetwork?: string;
  chainId?: number;
  rpcUrl?: string;
  vaultAddress?: string;
  cardAddress?: string;
  oracleAddress?: string;
  lensAddress?: string;
  protocolPlans?: Record<string, number>;
  nextTokenId?: number;
  deployerAddress?: string;
  networks?: Partial<Record<NetworkId, NetworkProfile>>;
};

function asAddress(value?: string): Address | undefined {
  if (!value || !isAddress(value)) return undefined;
  return value as Address;
}

function mergeProfile(id: NetworkId, stored?: NetworkProfile): NetworkProfile {
  const base = emptyProfile(id);
  return {
    ...base,
    ...stored,
    chainId: stored?.chainId || NETWORKS[id].chainId,
    rpcUrl: serverRpcUrl(id, stored?.rpcUrl),
    wsUrl: serverWsUrl(id, stored?.wsUrl),
    protocolPlans: { ...(base.protocolPlans ?? {}), ...(stored?.protocolPlans ?? {}) },
    tokens: { ...defaultTokenMap(id), ...(stored?.tokens ?? {}) },
    nextTokenId: stored?.nextTokenId || base.nextTokenId,
  };
}

function protocolFromProfile(id: NetworkId, profile: NetworkProfile): ProtocolConfig | null {
  const file = readDeployment(NETWORKS[id].chainId);
  const vault = asAddress(profile.vaultAddress) || file?.contracts.vault;
  const card = asAddress(profile.cardAddress) || file?.contracts.card;
  const oracle = asAddress(profile.oracleAddress) || file?.contracts.oracle;
  const lens = asAddress(profile.lensAddress) || file?.contracts.lens;
  if (!vault || !card || !oracle || !lens) return null;
  const planIds: Record<string, number> = { ...(profile.protocolPlans ?? {}) };
  if (file) {
    for (const plan of file.plans) planIds[plan.slug] = plan.id;
  }
  const def = NETWORKS[id];
  return {
    networkId: id,
    mode: def.mode,
    name: def.name,
    chainId: def.chainId,
    rpcUrl: profile.rpcUrl,
    explorerUrl: def.explorerUrl,
    vault,
    card,
    oracle,
    lens,
    planIds,
  };
}

function tokensFrom(id: NetworkId, profile: NetworkProfile): NetworkTokenMap {
  const file = readDeployment(NETWORKS[id].chainId);
  const fromFile: NetworkTokenMap = file
    ? {
        usdt: { address: file.contracts.usdt, decimals: 6 },
        usdc: { address: file.contracts.usdc, decimals: 6 },
        weth: { address: file.contracts.weth, decimals: 18 },
        wbtc: { address: file.contracts.wbtc, decimals: 8 },
      }
    : {};
  return { ...fromFile, ...defaultTokenMap(id), ...(profile.tokens ?? {}) };
}

function migrateLegacy(settings: SettingsDoc): Partial<Record<NetworkId, NetworkProfile>> {
  const networks = { ...(settings.networks ?? {}) };
  const guessed = settings.chainId ? networkIdFromChainId(settings.chainId) : DEFAULT_NETWORK_ID;
  const current = networks[guessed];
  if (!current?.vaultAddress && settings.vaultAddress) {
    networks[guessed] = mergeProfile(guessed, {
      ...current,
      chainId: settings.chainId || NETWORKS[guessed].chainId,
      rpcUrl: settings.rpcUrl || serverRpcUrl(guessed),
      vaultAddress: settings.vaultAddress,
      cardAddress: settings.cardAddress,
      oracleAddress: settings.oracleAddress,
      lensAddress: settings.lensAddress,
      protocolPlans: settings.protocolPlans,
      nextTokenId: settings.nextTokenId,
    });
  }
  return networks;
}

function legacyMirror(id: NetworkId, profile: NetworkProfile) {
  return {
    chainId: NETWORKS[id].chainId,
    rpcUrl: profile.rpcUrl,
    vaultAddress: profile.vaultAddress || "",
    cardAddress: profile.cardAddress || "",
    oracleAddress: profile.oracleAddress || "",
    lensAddress: profile.lensAddress || "",
    protocolPlans: profile.protocolPlans ?? {},
    nextTokenId: profile.nextTokenId || 1,
    deployerAddress: profile.deployerAddress || "",
  };
}

export async function loadSettingsDoc() {
  await connectDb();
  return Settings.findOne({ key: "app" });
}

export async function getActiveNetworkId(): Promise<NetworkId> {
  if (isBlockchainNetworkPinned()) return DEFAULT_NETWORK_ID;
  const settings = (await loadSettingsDoc()) as SettingsDoc | null;
  if (isNetworkId(settings?.activeNetwork)) return settings.activeNetwork;
  if (settings?.chainId) return networkIdFromChainId(settings.chainId);
  return DEFAULT_NETWORK_ID;
}

export async function getRuntimeNetwork(id?: NetworkId): Promise<RuntimeNetwork> {
  const settings = (await loadSettingsDoc()) as SettingsDoc | null;
  const active =
    id ??
    (isBlockchainNetworkPinned()
      ? DEFAULT_NETWORK_ID
      : isNetworkId(settings?.activeNetwork)
        ? settings.activeNetwork
        : undefined) ??
    (settings?.chainId ? networkIdFromChainId(settings.chainId) : DEFAULT_NETWORK_ID);
  const networks = migrateLegacy(settings ?? {});
  const profile = mergeProfile(active, networks[active]);
  const def = NETWORKS[active];
  const tokens = tokensFrom(active, profile);
  profile.tokens = tokens;
  return {
    id: active,
    name: def.name,
    shortLabel: def.shortLabel,
    mode: def.mode,
    chainId: def.chainId,
    rpcUrl: profile.rpcUrl,
    wsUrl: profile.wsUrl,
    explorerUrl: def.explorerUrl,
    capabilities: def.capabilities,
    profile,
    protocol: protocolFromProfile(active, profile),
    tokens,
  };
}

export async function listNetworkSummaries() {
  const settings = (await loadSettingsDoc()) as SettingsDoc | null;
  const active = await getActiveNetworkId();
  const networks = migrateLegacy(settings ?? {});
  return (Object.keys(NETWORKS) as NetworkId[]).map((id) => {
    const profile = mergeProfile(id, networks[id]);
    const protocol = protocolFromProfile(id, profile);
    const tokens = tokensFrom(id, profile);
    return {
      ...NETWORKS[id],
      active: id === active,
      rpcUrl: profile.rpcUrl,
      deployed: Boolean(protocol),
      vault: protocol?.vault ?? null,
      tokenCount: Object.values(tokens).filter((item) => item?.address).length,
      tokens,
    };
  });
}

export async function patchNetworkProfile(id: NetworkId, patch: Partial<NetworkProfile>) {
  await connectDb();
  const runtime = await getRuntimeNetwork(id);
  const next: NetworkProfile = {
    ...runtime.profile,
    ...patch,
    chainId: NETWORKS[id].chainId,
    protocolPlans: { ...(runtime.profile.protocolPlans ?? {}), ...(patch.protocolPlans ?? {}) },
    tokens: { ...(runtime.profile.tokens ?? {}), ...(patch.tokens ?? {}) },
  };
  const active = await getActiveNetworkId();
  const update: Record<string, unknown> = {
    [`networks.${id}`]: next,
  };
  if (active === id) Object.assign(update, legacyMirror(id, next));
  await Settings.findOneAndUpdate({ key: "app" }, { $set: update }, { upsert: true });
  return getRuntimeNetwork(id);
}

export async function switchActiveNetwork(id: NetworkId) {
  await connectDb();
  const currentId = await getActiveNetworkId();
  if (currentId !== id) {
    const current = await getRuntimeNetwork(currentId);
    await Settings.findOneAndUpdate(
      { key: "app" },
      { $set: { [`networks.${currentId}`]: current.profile } },
      { upsert: true },
    );
  }
  const runtime = await getRuntimeNetwork(id);
  await Settings.findOneAndUpdate(
    { key: "app" },
    {
      $set: {
        activeNetwork: id,
        [`networks.${id}`]: runtime.profile,
        ...legacyMirror(id, runtime.profile),
      },
    },
    { upsert: true },
  );

  const planIds = runtime.protocol?.planIds ?? runtime.profile.protocolPlans ?? {};
  const slugs = Object.keys(planIds);
  if (slugs.length) {
    for (const slug of slugs) {
      await Plan.findOneAndUpdate({ slug }, { $set: { onChainId: planIds[slug] } });
    }
  } else {
    await Plan.updateMany({}, { $unset: { onChainId: 1 } });
  }

  return getRuntimeNetwork(id);
}

export async function saveNetworkTokens(id: NetworkId, tokens: NetworkTokenMap) {
  return patchNetworkProfile(id, { tokens });
}

export function deploymentFromRuntime(runtime: RuntimeNetwork): Deployment | null {
  const protocol = runtime.protocol;
  const tokens = runtime.tokens;
  if (!protocol) return null;
  const usdt = tokens.usdt?.address;
  const usdc = tokens.usdc?.address;
  const weth = tokens.weth?.address;
  const wbtc = tokens.wbtc?.address;
  if (!usdt || !usdc || !weth || !wbtc) {
    const file = readDeployment(runtime.chainId);
    return file;
  }
  return {
    chainId: runtime.chainId,
    rpc: runtime.rpcUrl,
    deployer: (runtime.profile.deployerAddress as Address) || "0x0000000000000000000000000000000000000000",
    timestamp: Date.now(),
    contracts: {
      vault: protocol.vault,
      card: protocol.card,
      oracle: protocol.oracle,
      lens: protocol.lens,
      usdt,
      usdc,
      weth,
      wbtc,
    },
    plans: Object.entries(protocol.planIds).map(([slug, planId]) => ({ id: planId, slug })),
  };
}

export function publicNetworkView(runtime: RuntimeNetwork) {
  return {
    id: runtime.id,
    name: runtime.name,
    shortLabel: runtime.shortLabel,
    mode: runtime.mode,
    chainId: runtime.chainId,
    rpcUrl: runtime.rpcUrl,
    explorerUrl: runtime.explorerUrl,
    deployerAddress: runtime.profile.deployerAddress || "",
    capabilities: runtime.capabilities,
  };
}
