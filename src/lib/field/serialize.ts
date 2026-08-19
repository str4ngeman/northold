import { getToken } from "@/lib/dummy";
import type { FieldClaim } from "@/lib/field/claims";
import { coordLabel, districtPlan, getDistrict, getSite, type Site } from "@/lib/field/world";
import { formatTokenId } from "@/lib/format";
import { seamOf } from "@/lib/seams";

export type SerializedClaim = FieldClaim & {
  site: Site;
  coords: string;
  district: { id: string; code: string; name: string; ground: string; lore: string };
  seam: { slug: string; key: string; index: string; name: string; depth: string; color: string; matrix: string };
  plan: { id: string; name: string; lockSeconds: number; apyBps: number; minUsd: number; maxUsd: number };
  token: { id: string; symbol: string; name: string; priceUsd: number; color: string };
};

export function serializeClaim(claim: FieldClaim): SerializedClaim {
  const site = getSite(claim.siteId);
  if (!site) throw new Error(`Claim ${claim.id} points at a missing site.`);
  const district = getDistrict(claim.districtId);
  const plan = districtPlan(claim.districtId);
  const seam = seamOf(plan.id);
  const token = getToken(claim.assetId);

  return {
    ...claim,
    site,
    coords: coordLabel(site.x, site.y),
    district: {
      id: district.id,
      code: district.code,
      name: district.name,
      ground: district.ground,
      lore: district.lore,
    },
    seam: {
      slug: seam.slug,
      key: seam.key,
      index: seam.index,
      name: seam.name,
      depth: seam.depth,
      color: seam.color,
      matrix: seam.matrix,
    },
    plan: {
      id: plan.id,
      name: plan.name,
      lockSeconds: plan.lockSeconds,
      apyBps: plan.apyBps,
      minUsd: plan.minUsd,
      maxUsd: plan.maxUsd,
    },
    token: {
      id: token.id,
      symbol: token.symbol,
      name: token.name,
      priceUsd: token.priceUsd,
      color: token.color,
    },
  };
}

export function claimMetadata(claim: FieldClaim, origin: string) {
  const view = serializeClaim(claim);
  return {
    name: `${view.site.name} · ${view.site.id}`,
    description: `${view.district.lore} Pegged with ${view.token.symbol} against the ${view.seam.name} seam (${view.seam.depth}). Survey plate rendered from the field's own elevation model.`,
    image: `${origin}/api/universe/nft/${claim.id}/image`,
    external_url: `${origin}/universe/claim/${claim.id}`,
    attributes: [
      { trait_type: "District", value: view.district.name },
      { trait_type: "Site", value: view.site.name },
      { trait_type: "Seam", value: view.seam.name },
      { trait_type: "Elevation", value: view.site.metres, display_type: "number" },
      { trait_type: "Hectares", value: view.site.hectares, display_type: "number" },
      { trait_type: "Asset", value: view.token.symbol },
      { trait_type: "Register", value: formatTokenId(claim.id) },
    ],
  };
}
