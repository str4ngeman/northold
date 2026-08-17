export const vaultAbi = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "planId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "referrer", type: "address" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "paid", type: "uint256" },
      { name: "referralPaid", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "unlock",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "principal", type: "uint256" },
      { name: "rewardPaid", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "emergencyExit",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "returnedAmount", type: "uint256" },
      { name: "fee", type: "uint256" },
    ],
  },
  { type: "error", name: "DepositsPaused", inputs: [] },
  { type: "error", name: "ExitsPaused", inputs: [] },
  { type: "error", name: "UnknownPlan", inputs: [] },
  { type: "error", name: "InactivePlan", inputs: [] },
  { type: "error", name: "UnknownAsset", inputs: [] },
  { type: "error", name: "InactiveAsset", inputs: [] },
  { type: "error", name: "AmountOutOfRange", inputs: [] },
  { type: "error", name: "NotCardOwner", inputs: [] },
  { type: "error", name: "NotLocked", inputs: [] },
  { type: "error", name: "StillLocked", inputs: [] },
  { type: "error", name: "AlreadyMatured", inputs: [] },
  { type: "error", name: "NothingToClaim", inputs: [] },
  { type: "error", name: "InvalidBps", inputs: [] },
  { type: "error", name: "InsufficientAvailable", inputs: [] },
] as const;

export const lensAbi = [
  {
    type: "function",
    name: "positionsOf",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      {
        name: "list",
        type: "tuple[]",
        components: [
          { name: "tokenId", type: "uint256" },
          { name: "owner", type: "address" },
          { name: "asset", type: "address" },
          { name: "principal", type: "uint256" },
          { name: "principalUsd8", type: "uint256" },
          { name: "planId", type: "uint256" },
          { name: "planSlug", type: "bytes32" },
          { name: "startedAt", type: "uint64" },
          { name: "unlockAt", type: "uint64" },
          { name: "unlockedAt", type: "uint64" },
          { name: "accruedReward", type: "uint256" },
          { name: "claimedReward", type: "uint256" },
          { name: "claimableReward", type: "uint256" },
          { name: "lockSeconds", type: "uint32" },
          { name: "apyBps", type: "uint16" },
          { name: "emergencyFeeBps", type: "uint16" },
          { name: "rarity", type: "uint8" },
          { name: "sizeTier", type: "uint8" },
          { name: "status", type: "uint8" },
          { name: "lockProgressBps", type: "uint256" },
          { name: "matured", type: "bool" },
        ],
      },
    ],
  },
] as const;

export const erc721Abi = [
  {
    type: "function",
    name: "transferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const mockErc20Abi = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;

export function slugFromBytes32(hex: string) {
  const raw = hex.startsWith("0x") ? hex.slice(2) : hex;
  let out = "";
  for (let i = 0; i < raw.length; i += 2) {
    const code = Number.parseInt(raw.slice(i, i + 2), 16);
    if (!code) break;
    out += String.fromCharCode(code);
  }
  return out;
}

export const RARITY = ["common", "rare", "epic", "legendary"] as const;
export const TIER = ["spark", "vault", "sovereign"] as const;
export const STATUS = ["locked", "unlocked", "emergencyExited"] as const;
