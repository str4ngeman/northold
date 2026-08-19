/**
 * Prototype register. Occupancy lives in process memory until the vault can
 * mint against a site id — at that point this file goes and the chain answers
 * instead.
 */
import { getToken } from "@/lib/dummy";
import type { FieldClaim } from "@/lib/field/claims";
import { getSite } from "@/lib/field/world";

type Store = {
  nextId: number;
  byId: Map<number, FieldClaim>;
  bySite: Map<string, number>;
};

const g = globalThis as typeof globalThis & { __fieldRegister?: Store };

const DAY = 86_400_000;

function seed(): FieldClaim[] {
  const now = Date.now();
  const rows: Omit<FieldClaim, "id" | "districtId">[] = [
    { siteId: "GV-01", assetId: "usdt", amount: 4200, startedAt: now - 26 * DAY, holder: "0x7a3e…e6F7" },
    { siteId: "CR-02", assetId: "weth", amount: 1.25, startedAt: now - 61 * DAY, holder: "0x41b9…2c0a" },
    { siteId: "HD-01", assetId: "usdc", amount: 900, startedAt: now - 9 * DAY, holder: "0xd0c4…88b1" },
    { siteId: "VG-03", assetId: "wbtc", amount: 0.08, startedAt: now - 112 * DAY, holder: "0x9fe2…4417" },
    { siteId: "MW-02", assetId: "usdt", amount: 15_000, startedAt: now - 44 * DAY, holder: "0x2bb7…de53" },
    { siteId: "OF-04", assetId: "usdc", amount: 320, startedAt: now - 3 * DAY, holder: "0x6c18…9a20" },
  ];

  return rows
    .map((row, i) => {
      const site = getSite(row.siteId);
      if (!site) return null;
      return { ...row, id: i + 1, districtId: site.districtId } satisfies FieldClaim;
    })
    .filter((row): row is FieldClaim => row !== null);
}

function createStore(): Store {
  const byId = new Map<number, FieldClaim>();
  const bySite = new Map<string, number>();
  for (const claim of seed()) {
    byId.set(claim.id, claim);
    bySite.set(claim.siteId, claim.id);
  }
  return { nextId: byId.size + 1, byId, bySite };
}

function store() {
  if (!g.__fieldRegister) g.__fieldRegister = createStore();
  return g.__fieldRegister;
}

export function listClaims() {
  return [...store().byId.values()].sort((a, b) => b.id - a.id);
}

export function getClaim(id: number) {
  return store().byId.get(id) ?? null;
}

export function claimBySite(siteId: string) {
  const id = store().bySite.get(siteId);
  return id ? (store().byId.get(id) ?? null) : null;
}

export function createClaim(input: { siteId: string; assetId: string; amount: number }): FieldClaim {
  const site = getSite(input.siteId);
  if (!site) throw new Error("No such site on the sheet.");
  getToken(input.assetId);
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Stake must be positive.");

  const s = store();
  if (s.bySite.has(site.id)) throw new Error("That site is already pegged.");

  const claim: FieldClaim = {
    id: s.nextId++,
    siteId: site.id,
    districtId: site.districtId,
    assetId: input.assetId,
    amount: input.amount,
    startedAt: Date.now(),
    holder: "you",
  };
  s.byId.set(claim.id, claim);
  s.bySite.set(claim.siteId, claim.id);
  return claim;
}
