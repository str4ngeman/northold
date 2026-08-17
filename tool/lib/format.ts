import { formatUnits } from "viem";

export function usd8(n: bigint) {
  return Number(n) / 1e8;
}

export function money(n: number, digits = 2) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function token(amount: bigint, decimals: number, symbol: string) {
  return `${formatUnits(amount, decimals)} ${symbol}`;
}

export function bps(n: number) {
  return `${(n / 100).toFixed(n % 100 === 0 ? 0 : 1)}%`;
}

export function rarityName(n: number) {
  return ["common", "rare", "epic", "legendary"][n] ?? String(n);
}

export function tierName(n: number) {
  return ["spark", "vault", "sovereign"][n] ?? String(n);
}

export function statusName(n: number) {
  return ["locked", "unlocked", "emergencyExited"][n] ?? String(n);
}

export function slugFromBytes32(hex: string) {
  const raw = hex.startsWith("0x") ? hex.slice(2) : hex;
  const buf = Buffer.from(raw, "hex");
  const i = buf.indexOf(0);
  return buf.subarray(0, i === -1 ? buf.length : i).toString("utf8");
}

export function progressBar(bpsValue: bigint) {
  const pct = Number(bpsValue) / 100;
  const filled = Math.min(20, Math.max(0, Math.round(Number(bpsValue) / 500)));
  return `${"█".repeat(filled)}${"░".repeat(20 - filled)} ${pct.toFixed(1)}%`;
}
