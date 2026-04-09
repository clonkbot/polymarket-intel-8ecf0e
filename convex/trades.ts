import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get recent trades for a market
export const listByMarket = query({
  args: { marketId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("trades")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .order("desc")
      .take(limit);
  },
});

// Get all recent trades (pulse view)
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    return await ctx.db
      .query("trades")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});

// Get whale trades only
export const listWhaleTrades = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("trades")
      .withIndex("by_whale", (q) => q.eq("isWhale", true))
      .order("desc")
      .take(limit);
  },
});

// Record a new trade
export const create = mutation({
  args: {
    marketId: v.string(),
    price: v.number(),
    size: v.number(),
    side: v.string(),
    isWhale: v.boolean(),
    makerAddress: v.optional(v.string()),
    takerAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("trades", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

// Simulate a trade for demo purposes
export const simulateTrade = mutation({
  args: { marketId: v.string() },
  handler: async (ctx, args) => {
    const market = await ctx.db
      .query("markets")
      .withIndex("by_marketId", (q) => q.eq("marketId", args.marketId))
      .first();

    if (!market) return null;

    const isWhale = Math.random() < 0.08; // 8% chance of whale trade
    const side = Math.random() > 0.5 ? "BUY" : "SELL";
    const baseSize = isWhale ? 5000 + Math.random() * 45000 : 10 + Math.random() * 990;
    const priceVariation = (Math.random() - 0.5) * 0.01;

    const addresses = [
      "0x742d...8f3e",
      "0xabc1...def2",
      "0x9f8e...7d6c",
      "0x3a2b...1c4d",
      "0xf1e2...d3c4",
      "0x5678...abcd",
    ];

    const trade = {
      marketId: args.marketId,
      price: market.probability + priceVariation,
      size: Math.round(baseSize * 100) / 100,
      side,
      isWhale,
      makerAddress: addresses[Math.floor(Math.random() * addresses.length)],
      takerAddress: addresses[Math.floor(Math.random() * addresses.length)],
      timestamp: Date.now(),
    };

    await ctx.db.insert("trades", trade);

    // If whale, also create a whale alert
    if (isWhale) {
      await ctx.db.insert("whaleAlerts", {
        marketId: args.marketId,
        marketQuestion: market.question,
        address: trade.takerAddress!,
        action: side === "BUY" ? "SWEEP_BUY" : "SWEEP_SELL",
        size: trade.size,
        priceImpact: Math.abs(priceVariation) * 100,
        levelsSwept: Math.floor(Math.random() * 5) + 2,
        timestamp: Date.now(),
      });
    }

    return trade;
  },
});
