import bcrypt from "bcryptjs";

import { appNetworkId, isBlockchainNetworkPinned } from "@/lib/blockchain-network";
import { BRAND, DEFAULT_BEARINGS } from "@/lib/brand";
import { DAY_SECONDS } from "@/lib/math";
import { Plan } from "@/lib/models/plan";
import { Settings } from "@/lib/models/settings";
import { Token } from "@/lib/models/token";
import { User } from "@/lib/models/user";
import { makeReferralCode } from "@/lib/referral-code";

export async function seedDatabase() {
  await alignBrand();

  if ((await Settings.countDocuments()) === 0) {
    await Settings.create({
      key: "app",
      siteName: process.env.NEXT_PUBLIC_APP_NAME || BRAND.name,
      tagline: BRAND.tagline,
      rewardSymbol: "asset",
      referralBps: 500,
      supportEnabled: true,
      nextTokenId: 1,
      activeNetwork: appNetworkId(),
      networks: {
        sepolia: {
          chainId: 11155111,
          rpcUrl: process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "",
        },
        mainnet: {
          chainId: 1,
          rpcUrl: process.env.MAINNET_RPC_URL || process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "",
          tokens: {
            usdt: { address: "0xdac17f958d2ee523a2206206994597c13d831ec7", decimals: 6 },
            usdc: { address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6 },
            weth: { address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", decimals: 18 },
            wbtc: { address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", decimals: 8 },
          },
        },
      },
    });
  }

  if ((await Plan.countDocuments()) === 0) {
    await Plan.insertMany([
      {
        slug: DEFAULT_BEARINGS[0].slug,
        name: DEFAULT_BEARINGS[0].name,
        tagline: DEFAULT_BEARINGS[0].tagline,
        lockSeconds: 30 * DAY_SECONDS,
        minUsd: 100,
        maxUsd: 10_000,
        apyBps: 800,
        emergencyFeeBps: 1500,
        active: true,
      },
      {
        slug: DEFAULT_BEARINGS[1].slug,
        name: DEFAULT_BEARINGS[1].name,
        tagline: DEFAULT_BEARINGS[1].tagline,
        lockSeconds: 90 * DAY_SECONDS,
        minUsd: 250,
        maxUsd: 25_000,
        apyBps: 1200,
        emergencyFeeBps: 1200,
        active: true,
      },
      {
        slug: DEFAULT_BEARINGS[2].slug,
        name: DEFAULT_BEARINGS[2].name,
        tagline: DEFAULT_BEARINGS[2].tagline,
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
        address: "0x0000000000000000000000000000000000000000",
        decimals: 6,
        priceUsd: 1,
        color: "#26A17B",
        active: true,
      },
      {
        slug: "usdc",
        symbol: "USDC",
        name: "USD Coin",
        address: "0x0000000000000000000000000000000000000000",
        decimals: 6,
        priceUsd: 1,
        color: "#2775CA",
        active: true,
      },
      {
        slug: "weth",
        symbol: "WETH",
        name: "Wrapped Ether",
        address: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        priceUsd: 3500,
        color: "#8B5CF6",
        active: true,
      },
      {
        slug: "wbtc",
        symbol: "WBTC",
        name: "Wrapped Bitcoin",
        address: "0x0000000000000000000000000000000000000000",
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

async function alignBrand() {
  const network = appNetworkId();
  await Settings.updateMany({ activeNetwork: "anvil" }, { $set: { activeNetwork: network } });
  if (isBlockchainNetworkPinned()) {
    await Settings.updateMany({ key: "app" }, { $set: { activeNetwork: network } });
  }
  await Settings.updateMany(
    { siteName: { $in: ["Leagueto", "leagueto"] } },
    { $set: { siteName: process.env.NEXT_PUBLIC_APP_NAME || BRAND.name, tagline: BRAND.tagline } },
  );
  await Settings.updateMany(
    { tagline: { $in: ["The card is the stake.", "Hold north. Collect USDT."] } },
    { $set: { tagline: BRAND.tagline } },
  );
  await Settings.updateMany({ rewardSymbol: "USDT" }, { $set: { rewardSymbol: "asset" } });

  const previous = [
    { slug: "pulse", names: ["Pulse"] },
    { slug: "horizon", names: ["Horizon"] },
    { slug: "apex", names: ["Apex"] },
  ] as const;

  for (const item of previous) {
    const bearing = DEFAULT_BEARINGS.find((row) => row.slug === item.slug);
    if (!bearing) continue;
    await Plan.updateMany(
      { slug: item.slug, name: { $in: [...item.names] } },
      { $set: { name: bearing.name, tagline: bearing.tagline } },
    );
  }
}
