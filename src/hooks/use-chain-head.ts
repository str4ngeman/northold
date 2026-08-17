"use client";

import { useBlock } from "wagmi";

export function useChainHead(enabled: boolean, chainId?: number) {
  const { data: block } = useBlock({
    chainId,
    watch: true,
    query: { enabled },
  });

  return {
    blockNumber: block?.number,
    timestampMs: block ? Number(block.timestamp) * 1000 : undefined,
  };
}
