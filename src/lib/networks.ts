import { foundry, mainnet, sepolia } from "viem/chains";

export const NETWORK_IDS = ["anvil", "sepolia", "mainnet"] as const;
export type NetworkId = (typeof NETWORK_IDS)[number];
export type NetworkMode = "lab" | "test" | "live";

export type NetworkTokenMeta = {
  address: `0x${string}`;
  decimals: number;
};

export type NetworkTokenMap = Partial<Record<string, NetworkTokenMeta>>;

export type NetworkProfile = {
  chainId: number;
  rpcUrl: string;
  wsUrl?: string;
  vaultAddress?: string;
  cardAddress?: string;
  oracleAddress?: string;
  lensAddress?: string;
  protocolPlans?: Record<string, number>;
  tokens?: NetworkTokenMap;
  nextTokenId?: number;
};

export type NetworkCapabilities = {
  warp: boolean;
  faucet: boolean;
  deployMocks: boolean;
};

export type NetworkDefinition = {
  id: NetworkId;
  mode: NetworkMode;
  name: string;
  shortLabel: string;
  chainId: number;
  explorerUrl: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  capabilities: NetworkCapabilities;
};

export const LAB_TOKEN_DECIMALS = {
  usdt: 6,
  usdc: 6,
  weth: 18,
  wbtc: 8,
} as const;

export type LabTokenSlug = keyof typeof LAB_TOKEN_DECIMALS;

export const MAINNET_TOKEN_ADDRESSES: Record<LabTokenSlug, `0x${string}`> = {
  usdt: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  weth: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  wbtc: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
};

export const NETWORKS: Record<NetworkId, NetworkDefinition> = {
  anvil: {
    id: "anvil",
    mode: "lab",
    name: "Local (Anvil)",
    shortLabel: "Anvil",
    chainId: 31337,
    explorerUrl: "",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    capabilities: { warp: true, faucet: true, deployMocks: true },
  },
  sepolia: {
    id: "sepolia",
    mode: "test",
    name: "Test (Sepolia)",
    shortLabel: "Sepolia",
    chainId: 11155111,
    explorerUrl: "https://sepolia.etherscan.io",
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
    capabilities: { warp: false, faucet: false, deployMocks: true },
  },
  mainnet: {
    id: "mainnet",
    mode: "live",
    name: "Live (Ethereum)",
    shortLabel: "Mainnet",
    chainId: 1,
    explorerUrl: "https://etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    capabilities: { warp: false, faucet: false, deployMocks: false },
  },
};

export const ANVIL_RPC = "http://127.0.0.1:8545";
export const ANVIL_WS = "ws://127.0.0.1:8545";

export function isNetworkId(value: unknown): value is NetworkId {
  return typeof value === "string" && (NETWORK_IDS as readonly string[]).includes(value);
}

export function networkByChainId(chainId: number): NetworkDefinition | undefined {
  return Object.values(NETWORKS).find((item) => item.chainId === chainId);
}

export function networkIdFromChainId(chainId: number): NetworkId {
  return networkByChainId(chainId)?.id ?? "anvil";
}

export function publicRpcUrl(id: NetworkId): string {
  if (id === "anvil") return ANVIL_RPC;
  if (id === "sepolia") {
    return process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
  }
  return process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://ethereum-rpc.publicnode.com";
}

export function publicWsUrl(id: NetworkId): string | undefined {
  if (id === "anvil") return ANVIL_WS;
  if (id === "sepolia") return process.env.NEXT_PUBLIC_SEPOLIA_WS_URL || undefined;
  return process.env.NEXT_PUBLIC_MAINNET_WS_URL || undefined;
}

export function serverRpcUrl(id: NetworkId, profileRpc?: string): string {
  if (profileRpc) return profileRpc;
  if (id === "anvil") return process.env.ANVIL_RPC_URL || ANVIL_RPC;
  if (id === "sepolia") {
    return process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || publicRpcUrl(id);
  }
  return process.env.MAINNET_RPC_URL || process.env.NEXT_PUBLIC_MAINNET_RPC_URL || publicRpcUrl(id);
}

export function serverWsUrl(id: NetworkId, profileWs?: string): string | undefined {
  if (profileWs) return profileWs;
  return publicWsUrl(id);
}

export function explorerAddressUrl(explorerUrl: string, address: string) {
  if (!explorerUrl) return "";
  return `${explorerUrl}/address/${address}`;
}

export function explorerTxUrl(explorerUrl: string, hash: string) {
  if (!explorerUrl) return "";
  return `${explorerUrl}/tx/${hash}`;
}

export function explorerBlockUrl(explorerUrl: string, block: string | number) {
  if (!explorerUrl) return "";
  return `${explorerUrl}/block/${block}`;
}

export function viemChain(id: NetworkId) {
  if (id === "sepolia") return sepolia;
  if (id === "mainnet") return mainnet;
  return {
    ...foundry,
    name: "Anvil",
    rpcUrls: {
      default: { http: [ANVIL_RPC], webSocket: [ANVIL_WS] },
      public: { http: [ANVIL_RPC], webSocket: [ANVIL_WS] },
    },
  };
}

export function walletAddChainParams(id: NetworkId, rpcUrl?: string) {
  const def = NETWORKS[id];
  const rpc = rpcUrl && !rpcUrl.includes("127.0.0.1") ? rpcUrl : publicRpcUrl(id);
  return {
    chainId: `0x${def.chainId.toString(16)}`,
    chainName: def.name,
    nativeCurrency: def.nativeCurrency,
    rpcUrls: [rpc],
    blockExplorerUrls: def.explorerUrl ? [def.explorerUrl] : undefined,
  };
}

export function defaultTokenMap(id: NetworkId): NetworkTokenMap {
  if (id !== "mainnet") return {};
  return {
    usdt: { address: MAINNET_TOKEN_ADDRESSES.usdt, decimals: 6 },
    usdc: { address: MAINNET_TOKEN_ADDRESSES.usdc, decimals: 6 },
    weth: { address: MAINNET_TOKEN_ADDRESSES.weth, decimals: 18 },
    wbtc: { address: MAINNET_TOKEN_ADDRESSES.wbtc, decimals: 8 },
  };
}

export function emptyProfile(id: NetworkId): NetworkProfile {
  return {
    chainId: NETWORKS[id].chainId,
    rpcUrl: serverRpcUrl(id),
    wsUrl: serverWsUrl(id),
    protocolPlans: {},
    tokens: defaultTokenMap(id),
    nextTokenId: 1,
  };
}
