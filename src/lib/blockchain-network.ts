export const BLOCKCHAIN_NETWORK_IDS = ["sepolia", "mainnet"] as const;
export type BlockchainNetworkId = (typeof BLOCKCHAIN_NETWORK_IDS)[number];

const CHAIN_ID_BY_NETWORK: Record<BlockchainNetworkId, number> = {
  sepolia: 11155111,
  mainnet: 1,
};

const ALIASES: Record<string, BlockchainNetworkId> = {
  sepolia: "sepolia",
  sep: "sepolia",
  "eth-sepolia": "sepolia",
  "ethereum-sepolia": "sepolia",
  "sepolia-eth": "sepolia",
  "sepolia-testnet": "sepolia",
  mainnet: "mainnet",
  main: "mainnet",
  eth: "mainnet",
  ethereum: "mainnet",
  "eth-mainnet": "mainnet",
  "ethereum-mainnet": "mainnet",
};

function isBlockchainNetworkId(value: string): value is BlockchainNetworkId {
  return (BLOCKCHAIN_NETWORK_IDS as readonly string[]).includes(value);
}

function fromChainId(chainId: number): BlockchainNetworkId | undefined {
  const match = (Object.entries(CHAIN_ID_BY_NETWORK) as [BlockchainNetworkId, number][]).find(
    ([, id]) => id === chainId,
  );
  return match?.[0];
}

/** Reads `BLOCKCHAIN_NETWORK` / `NEXT_PUBLIC_BLOCKCHAIN_NETWORK` (sepolia, mainnet, or a chain id). */
export function parseBlockchainNetwork(raw: string | undefined | null): BlockchainNetworkId {
  const key = raw?.trim().toLowerCase();
  if (!key) return "sepolia";
  if (isBlockchainNetworkId(key)) return key;
  const alias = ALIASES[key];
  if (alias) return alias;
  if (key.startsWith("0x")) {
    const chainId = Number.parseInt(key, 16);
    const id = Number.isFinite(chainId) ? fromChainId(chainId) : undefined;
    if (id) return id;
  }
  if (/^\d+$/.test(key)) {
    const id = fromChainId(Number(key));
    if (id) return id;
  }
  throw new Error(
    `Unknown BLOCKCHAIN_NETWORK "${raw}". Use sepolia or mainnet (or chain id 11155111 / 1).`,
  );
}

export function blockchainNetworkEnv(): string | undefined {
  for (const value of [process.env.BLOCKCHAIN_NETWORK, process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK]) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function isBlockchainNetworkPinned(): boolean {
  return Boolean(blockchainNetworkEnv());
}

export function appNetworkId(): BlockchainNetworkId {
  return parseBlockchainNetwork(blockchainNetworkEnv());
}
