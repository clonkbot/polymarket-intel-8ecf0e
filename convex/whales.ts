import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get recent whale alerts
export const listAlerts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 30;
    return await ctx.db
      .query("whaleAlerts")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});

// Get whale activity by address
export const getByAddress = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("whaleAlerts")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .order("desc")
      .take(50);
  },
});

// Get whale stats
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const alerts = await ctx.db
      .query("whaleAlerts")
      .withIndex("by_timestamp")
      .filter((q) => q.gt(q.field("timestamp"), dayAgo))
      .collect();

    const totalVolume = alerts.reduce((sum, a) => sum + a.size, 0);
    const buyVolume = alerts
      .filter((a) => a.action === "SWEEP_BUY")
      .reduce((sum, a) => sum + a.size, 0);
    const sellVolume = alerts
      .filter((a) => a.action === "SWEEP_SELL")
      .reduce((sum, a) => sum + a.size, 0);

    const uniqueAddresses = new Set(alerts.map((a) => a.address));

    return {
      totalAlerts: alerts.length,
      totalVolume,
      buyVolume,
      sellVolume,
      uniqueWhales: uniqueAddresses.size,
      buyRatio: totalVolume > 0 ? buyVolume / totalVolume : 0.5,
    };
  },
});

// Create a whale alert
export const create = mutation({
  args: {
    marketId: v.string(),
    marketQuestion: v.string(),
    address: v.string(),
    action: v.string(),
    size: v.number(),
    priceImpact: v.number(),
    levelsSwept: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("whaleAlerts", {
      ...args,
      timestamp: Date.now(),
    });
  },
});
