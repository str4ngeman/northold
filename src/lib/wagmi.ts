import { createConfig, fallback, http, webSocket } from "wagmi";
import { foundry, mainnet, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

import { ANVIL_RPC, ANVIL_WS, publicRpcUrl, publicWsUrl, type NetworkId } from "@/lib/networks";

export const anvilChain = {
  ...foundry,
  name: "Anvil",
  rpcUrls: {
    default: { http: [ANVIL_RPC], webSocket: [ANVIL_WS] },
    public: { http: [ANVIL_RPC], webSocket: [ANVIL_WS] },
  },
};

export const sepoliaChain = {
  ...sepolia,
  rpcUrls: {
    ...sepolia.rpcUrls,
    default: {
      http: [publicRpcUrl("sepolia")],
      ...(publicWsUrl("sepolia") ? { webSocket: [publicWsUrl("sepolia") as string] } : {}),
    },
  },
};

export const mainnetChain = {
  ...mainnet,
  rpcUrls: {
    ...mainnet.rpcUrls,
    default: {
      http: [publicRpcUrl("mainnet")],
      ...(publicWsUrl("mainnet") ? { webSocket: [publicWsUrl("mainnet") as string] } : {}),
    },
  },
};

function transportFor(id: NetworkId) {
  const rpc = publicRpcUrl(id);
  const ws = publicWsUrl(id);
  if (typeof window === "undefined") return http(rpc);
  if (ws) return fallback([webSocket(ws), http(rpc)]);
  return http(rpc);
}

export const wagmiConfig = createConfig({
  chains: [anvilChain, sepoliaChain, mainnetChain],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [anvilChain.id]: transportFor("anvil"),
    [sepoliaChain.id]: transportFor("sepolia"),
    [mainnetChain.id]: transportFor("mainnet"),
  },
  pollingInterval: 12_000,
  ssr: true,
});

/** @deprecated Use catalog.network.chainId. Kept for Anvil-only call sites. */
export const appChain = anvilChain;
