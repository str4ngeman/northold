import type { DistrictId } from "@/lib/field/world";

export type FieldClaim = {
  id: number;
  siteId: string;
  districtId: DistrictId;
  assetId: string;
  amount: number;
  startedAt: number;
  /** Display handle for the register. The prototype has no wallet binding yet. */
  holder: string;
};

export function defaultAmount(assetId: string) {
  if (assetId === "weth") return 0.4;
  if (assetId === "wbtc") return 0.01;
  return 500;
}
