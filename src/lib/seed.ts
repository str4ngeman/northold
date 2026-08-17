import bcrypt from "bcryptjs";

import { DAY_SECONDS } from "@/lib/math";
import { Plan } from "@/lib/models/plan";
import { Settings } from "@/lib/models/settings";
import { Token } from "@/lib/models/token";
import { User } from "@/lib/models/user";
import { makeReferralCode } from "@/lib/referral-code";

export async function seedDatabase() {
  if ((await Settings.countDocuments()) === 0) {
    await Settings.create({
      key: "app",
      siteName: process.env.NEXT_PUBLIC_APP_NAME || "Leagueto",
      tagline: "The card is the stake.",
      rewardSymbol: "USDT",
      referralBps: 500,
      supportEnabled: true,
      nextTokenId: 1,
    });
  }

  if ((await Plan.countDocuments()) === 0) {
    await Plan.insertMany([
      {
        slug: "pulse",
        name: "Pulse",
        tagline: "Short lock, faster turnover",
        lockSeconds: 30 * DAY_SECONDS,
        minUsd: 100,
        maxUsd: 10_000,
        apyBps: 800,
        emergencyFeeBps: 1500,
        active: true,
      },
      {
        slug: "horizon",
        name: "Horizon",
        tagline: "Balanced yield and commitment",
        lockSeconds: 90 * DAY_SECONDS,
        minUsd: 250,
        maxUsd: 25_000,
        apyBps: 1200,
        emergencyFeeBps: 1200,
        active: true,
      },
      {
        slug: "apex",
        name: "Apex",
        tagline: "Longest lock, highest coupon",
        lockSeconds: 180 * DAY_SECONDS,
        minUsd: 500,
        maxUsd: 50_000,
        apyBps: 1800,
        emergencyFeeBps: 1000,
        active: true,
      },
    ]);
  }

  if ((await Token.countDocuments()) === 0) {
    await Token.insertMany([
      {
        slug: "usdt",
        symbol: "USDT",
        name: "Tether USD",
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        decimals: 6,
        priceUsd: 1,
        color: "#26A17B",
        active: true,
      },
      {
        slug: "usdc",
        symbol: "USDC",
        name: "USD Coin",
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        decimals: 6,
        priceUsd: 1,
        color: "#2775CA",
        active: true,
      },
      {
        slug: "weth",
        symbol: "WETH",
        name: "Wrapped Ether",
        address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        decimals: 18,
        priceUsd: 3500,
        color: "#8B5CF6",
        active: true,
      },
      {
        slug: "wbtc",
        symbol: "WBTC",
        name: "Wrapped Bitcoin",
        address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        decimals: 8,
        priceUsd: 95_000,
        color: "#F7931A",
        active: true,
      },
    ]);
  }

  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password && !(await User.findOne({ email }))) {
    await User.create({
      email,
      passwordHash: await bcrypt.hash(password, 12),
      name: "Admin",
      role: "admin",
      referralCode: makeReferralCode(),
    });
  }
}
