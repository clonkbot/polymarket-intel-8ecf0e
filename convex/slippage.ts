import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get slippage calculations for a market
export const getByMarket = query({
  args: { marketId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("slippageCalcs")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .first();
  },
});

// Calculate and store slippage for a market
export const calculate = mutation({
  args: { marketId: v.string() },
  handler: async (ctx, args) => {
    const market = await ctx.db
      .query("markets")
      .withIndex("by_marketId", (q) => q.eq("marketId", args.marketId))
      .first();

    if (!market) return null;

    // Simulate slippage based on liquidity
    // In reality, this would analyze the order book
    const liquidityFactor = market.liquidity > 0 ? market.liquidity : 100000;

    const calculateSlippage = (size: number, isBuy: boolean) => {
      // Simple model: slippage = size / liquidity * impact_multiplier
      const baseImpact = (size / liquidityFactor) * 100;
      const spreadImpact = market.spreadPercent / 2;
      const wallPressure = isBuy
        ? (1 - market.bidWallStrength) * 0.5
        : (1 - market.askWallStrength) * 0.5;

      return Math.round((baseImpact + spreadImpact + wallPressure) * 100) / 100;
    };

    const slippage = {
      marketId: args.marketId,
      tradeSize500: {
        buy: calculateSlippage(500, true),
        sell: calculateSlippage(500, false),
      },
      tradeSize1000: {
        buy: calculateSlippage(1000, true),
        sell: calculateSlippage(1000, false),
      },
      tradeSize5000: {
        buy: calculateSlippage(5000, true),
        sell: calculateSlippage(5000, false),
      },
      lastUpdated: Date.now(),
    };

    const existing = await ctx.db
      .query("slippageCalcs")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, slippage);
      return existing._id;
    } else {
      return await ctx.db.insert("slippageCalcs", slippage);
    }
  },
});
