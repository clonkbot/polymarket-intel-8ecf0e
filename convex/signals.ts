import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get recent signals
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("signals")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});

// Get unacknowledged signals
export const listUnacknowledged = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("signals")
      .withIndex("by_acknowledged", (q) => q.eq("acknowledged", false))
      .order("desc")
      .take(20);
  },
});

// Create a signal
export const create = mutation({
  args: {
    marketId: v.string(),
    marketQuestion: v.string(),
    signalType: v.string(),
    severity: v.string(),
    message: v.string(),
    data: v.object({
      currentValue: v.number(),
      threshold: v.number(),
      direction: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("signals", {
      ...args,
      timestamp: Date.now(),
      acknowledged: false,
    });
  },
});

// Acknowledge a signal
export const acknowledge = mutation({
  args: { signalId: v.id("signals") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    await ctx.db.patch(args.signalId, {
      acknowledged: true,
      acknowledgedBy: userId ?? undefined,
    });
  },
});

// Generate signals based on market conditions
export const checkMarketSignals = mutation({
  args: { marketId: v.string() },
  handler: async (ctx, args) => {
    const market = await ctx.db
      .query("markets")
      .withIndex("by_marketId", (q) => q.eq("marketId", args.marketId))
      .first();

    if (!market) return;

    const signals = [];

    // Check order book imbalance
    if (market.orderBookImbalance > 0.70) {
      signals.push({
        marketId: market.marketId,
        marketQuestion: market.question,
        signalType: "UPWARD_PRESSURE",
        severity: market.orderBookImbalance > 0.85 ? "high" : "medium",
        message: `Strong buy pressure detected (${(market.orderBookImbalance * 100).toFixed(1)}% bid dominance)`,
        data: {
          currentValue: market.orderBookImbalance,
          threshold: 0.70,
          direction: "up",
        },
      });
    } else if (market.orderBookImbalance < 0.30) {
      signals.push({
        marketId: market.marketId,
        marketQuestion: market.question,
        signalType: "DOWNWARD_PRESSURE",
        severity: market.orderBookImbalance < 0.15 ? "high" : "medium",
        message: `Strong sell pressure detected (${((1 - market.orderBookImbalance) * 100).toFixed(1)}% ask dominance)`,
        data: {
          currentValue: market.orderBookImbalance,
          threshold: 0.30,
          direction: "down",
        },
      });
    }

    // Check toxic spread
    if (market.spreadPercent > 2.0) {
      signals.push({
        marketId: market.marketId,
        marketQuestion: market.question,
        signalType: "TOXIC_SPREAD",
        severity: market.spreadPercent > 3.0 ? "high" : "medium",
        message: `Illiquid market warning: ${market.spreadPercent.toFixed(1)}% spread`,
        data: {
          currentValue: market.spreadPercent,
          threshold: 2.0,
        },
      });
    }

    // Check VWAP divergence
    const vwapDivergence = Math.abs(market.probability - market.vwap) / market.probability;
    if (vwapDivergence > 0.05) {
      signals.push({
        marketId: market.marketId,
        marketQuestion: market.question,
        signalType: "HIGH_VWAP_DIVERGENCE",
        severity: vwapDivergence > 0.10 ? "high" : "low",
        message: `Price diverging from VWAP by ${(vwapDivergence * 100).toFixed(1)}%`,
        data: {
          currentValue: vwapDivergence,
          threshold: 0.05,
          direction: market.probability > market.vwap ? "up" : "down",
        },
      });
    }

    // Insert signals with rate limiting (only one of each type per market per 5 min)
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    for (const signal of signals) {
      const recentSignal = await ctx.db
        .query("signals")
        .withIndex("by_market", (q) => q.eq("marketId", signal.marketId))
        .filter((q) =>
          q.and(
            q.eq(q.field("signalType"), signal.signalType),
            q.gt(q.field("timestamp"), fiveMinAgo)
          )
        )
        .first();

      if (!recentSignal) {
        await ctx.db.insert("signals", {
          ...signal,
          timestamp: Date.now(),
          acknowledged: false,
        });
      }
    }
  },
});
