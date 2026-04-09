import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get all tracked markets
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("markets")
      .order("desc")
      .take(50);
  },
});

// Get a specific market
export const get = query({
  args: { marketId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("markets")
      .withIndex("by_marketId", (q) => q.eq("marketId", args.marketId))
      .first();
  },
});

// Update or create market data
export const upsert = mutation({
  args: {
    marketId: v.string(),
    question: v.string(),
    slug: v.string(),
    probability: v.number(),
    volume24h: v.number(),
    liquidity: v.number(),
    bidWallStrength: v.number(),
    askWallStrength: v.number(),
    spreadPercent: v.number(),
    vwap: v.number(),
    orderBookImbalance: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("markets")
      .withIndex("by_marketId", (q) => q.eq("marketId", args.marketId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        lastUpdated: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("markets", {
        ...args,
        lastUpdated: Date.now(),
      });
    }
  },
});

// Seed initial demo markets
export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const demoMarkets = [
      {
        marketId: "btc-100k-2024",
        question: "Will Bitcoin reach $100,000 by end of 2024?",
        slug: "btc-100k-2024",
        probability: 0.42,
        volume24h: 1250000,
        liquidity: 890000,
        bidWallStrength: 0.72,
        askWallStrength: 0.45,
        spreadPercent: 0.8,
        vwap: 0.415,
        orderBookImbalance: 0.62,
      },
      {
        marketId: "eth-etf-approval",
        question: "Will Ethereum Spot ETF be approved in Q1 2025?",
        slug: "eth-etf-approval",
        probability: 0.78,
        volume24h: 3450000,
        liquidity: 2100000,
        bidWallStrength: 0.85,
        askWallStrength: 0.32,
        spreadPercent: 0.5,
        vwap: 0.765,
        orderBookImbalance: 0.73,
      },
      {
        marketId: "fed-rate-cut",
        question: "Will the Fed cut rates by 50bps in December?",
        slug: "fed-rate-cut",
        probability: 0.31,
        volume24h: 890000,
        liquidity: 450000,
        bidWallStrength: 0.38,
        askWallStrength: 0.68,
        spreadPercent: 1.2,
        vwap: 0.325,
        orderBookImbalance: 0.36,
      },
      {
        marketId: "trump-2024",
        question: "Will Trump win the 2024 Presidential Election?",
        slug: "trump-2024",
        probability: 0.52,
        volume24h: 12500000,
        liquidity: 8900000,
        bidWallStrength: 0.58,
        askWallStrength: 0.55,
        spreadPercent: 0.3,
        vwap: 0.518,
        orderBookImbalance: 0.51,
      },
      {
        marketId: "solana-flip-eth",
        question: "Will Solana market cap exceed Ethereum by 2025?",
        slug: "solana-flip-eth",
        probability: 0.15,
        volume24h: 450000,
        liquidity: 180000,
        bidWallStrength: 0.25,
        askWallStrength: 0.82,
        spreadPercent: 2.5,
        vwap: 0.142,
        orderBookImbalance: 0.23,
      },
      {
        marketId: "ai-agi-2025",
        question: "Will AGI be achieved by any lab before 2026?",
        slug: "ai-agi-2025",
        probability: 0.08,
        volume24h: 320000,
        liquidity: 95000,
        bidWallStrength: 0.12,
        askWallStrength: 0.91,
        spreadPercent: 3.1,
        vwap: 0.075,
        orderBookImbalance: 0.12,
      },
    ];

    for (const market of demoMarkets) {
      const existing = await ctx.db
        .query("markets")
        .withIndex("by_marketId", (q) => q.eq("marketId", market.marketId))
        .first();

      if (!existing) {
        await ctx.db.insert("markets", {
          ...market,
          lastUpdated: Date.now(),
        });
      }
    }
  },
});

// Simulate real-time market updates
export const simulateUpdate = mutation({
  args: { marketId: v.string() },
  handler: async (ctx, args) => {
    const market = await ctx.db
      .query("markets")
      .withIndex("by_marketId", (q) => q.eq("marketId", args.marketId))
      .first();

    if (!market) return null;

    // Simulate small price movements
    const priceDelta = (Math.random() - 0.5) * 0.02;
    const newProb = Math.max(0.01, Math.min(0.99, market.probability + priceDelta));
    const volumeDelta = Math.random() * 50000;
    const imbalanceDelta = (Math.random() - 0.5) * 0.1;

    await ctx.db.patch(market._id, {
      probability: newProb,
      volume24h: market.volume24h + volumeDelta,
      vwap: market.vwap + priceDelta * 0.8,
      orderBookImbalance: Math.max(0, Math.min(1, market.orderBookImbalance + imbalanceDelta)),
      lastUpdated: Date.now(),
    });

    return market._id;
  },
});
