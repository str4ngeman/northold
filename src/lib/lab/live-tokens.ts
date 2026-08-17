import {
  LAB_TOKEN_DECIMALS,
  MAINNET_TOKEN_ADDRESSES,
  type LabTokenSlug,
  type NetworkId,
  type NetworkTokenMap,
} from "@/lib/networks";

export { LAB_TOKEN_DECIMALS, MAINNET_TOKEN_ADDRESSES, type LabTokenSlug };

export type TokenNetwork = NetworkId | "custom";

export type LiveToken = {
  slug: LabTokenSlug;
  address: `0x${string}`;
  decimals: number;
};

export function isLabTokenSlug(slug: string): slug is LabTokenSlug {
  return slug in LAB_TOKEN_DECIMALS;
}

const MAINNET_LOWER = new Set(Object.values(MAINNET_TOKEN_ADDRESSES).map((addr) => addr.toLowerCase()));

export function tokenNetworkOf(address: string, networkId?: NetworkId): TokenNetwork {
  const lower = address.toLowerCase();
  if (MAINNET_LOWER.has(lower)) return "mainnet";
  if (lower === "0x0000000000000000000000000000000000000000") return "custom";
  return networkId ?? "custom";
}

export function bindAddress(
  slug: string,
  stored: string,
  tokens: NetworkTokenMap,
  networkId?: NetworkId,
): {
  address: `0x${string}`;
  decimals?: number;
  network: TokenNetwork;
} {
  const live = tokens[slug];
  if (live?.address) {
    return {
      address: live.address,
      decimals: live.decimals,
      network: networkId ?? tokenNetworkOf(live.address),
    };
  }
  return { address: stored as `0x${string}`, network: tokenNetworkOf(stored, networkId) };
}
