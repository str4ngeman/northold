import { json, requireAdmin } from "@/lib/api-guard";
import { mapPosition } from "@/lib/map-position";
import { Position } from "@/lib/models/position";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const rows = await Position.find().sort({ tokenId: -1 }).limit(500);
  return json({ positions: rows.map(mapPosition) });
}
