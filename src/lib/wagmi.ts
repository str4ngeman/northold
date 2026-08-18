import { createConfig, fallback, http, webSocket } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

import { appNetworkId, publicRpcUrl, publicWsUrl, type NetworkId } from "@/lib/networks";

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

export const appChain = appNetworkId() === "mainnet" ? mainnetChain : sepoliaChain;
const extraChain = appChain.id === sepoliaChain.id ? mainnetChain : sepoliaChain;

export const wagmiConfig = createConfig({
  chains: [appChain, extraChain],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [sepoliaChain.id]: transportFor("sepolia"),
    [mainnetChain.id]: transportFor("mainnet"),
  },
  pollingInterval: 12_000,
  ssr: true,
});
