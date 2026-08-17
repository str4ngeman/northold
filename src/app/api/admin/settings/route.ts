import { NextRequest, NextResponse } from "next/server";

import { json, requireAdmin } from "@/lib/api-guard";
import { decodeChainError, loadLiveProtocol, setReferralBpsOnChain } from "@/lib/lab/chain-write";
import { validateReferralBps } from "@/lib/lab/plan-codec";
import { Settings } from "@/lib/models/settings";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const settings = await Settings.findOne({ key: "app" });
  return json({ settings });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const body = await request.json();
  const referralBps = Number(body.referralBps);
  const invalid = validateReferralBps(referralBps);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const protocol = await loadLiveProtocol();
  if (protocol) {
    try {
      await setReferralBpsOnChain(referralBps);
    } catch (err) {
      return NextResponse.json({ error: decodeChainError(err) }, { status: 502 });
    }
  }

  const settings = await Settings.findOneAndUpdate(
    { key: "app" },
    {
      $set: {
        siteName: body.siteName,
        tagline: body.tagline,
        rewardSymbol: body.rewardSymbol,
        referralBps,
        supportEnabled: Boolean(body.supportEnabled),
      },
    },
    { new: true },
  );
  if (!settings) return NextResponse.json({ error: "Settings missing" }, { status: 404 });
  return json({ settings, chain: protocol ? "updated" : "skipped" });
}
