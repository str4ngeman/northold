import { DAY_SECONDS } from "@/lib/math";
import type { Rarity, SizeTier } from "@/lib/types";

export function formatUsd(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatTokenAmount(value: number, symbol: string) {
  const digits = value >= 1000 ? 2 : value >= 1 ? 4 : 6;
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(value);
  return `${formatted} ${symbol}`;
}

export function formatApy(bps: number) {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}% APY`;
}

export function formatFee(bps: number) {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}

export function formatLock(seconds: number) {
  const days = Math.round(seconds / DAY_SECONDS);
  return `${days} day lock`;
}

export function formatTokenId(id: number) {
  return `#${id.toString().padStart(4, "0")}`;
}

export function formatAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatCountdown(ms: number) {
  if (ms <= 0) return "Matured";
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / DAY_SECONDS);
  const hours = Math.floor((total % DAY_SECONDS) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function rarityLabel(rarity: Rarity) {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

export function sizeTierLabel(tier: SizeTier) {
  if (tier === "spark") return "Spark · under $1k";
  if (tier === "vault") return "Vault · $1k–$10k";
  return "Sovereign · $10k+";
}
