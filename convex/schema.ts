import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // Markets being tracked
  markets: defineTable({
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
    lastUpdated: v.number(),
    createdBy: v.optional(v.id("users")),
  }).index("by_marketId", ["marketId"])
    .index("by_volume", ["volume24h"]),

  // Real-time trades feed
  trades: defineTable({
    marketId: v.string(),
    price: v.number(),
    size: v.number(),
    side: v.string(), // "BUY" or "SELL"
    isWhale: v.boolean(),
    makerAddress: v.optional(v.string()),
    takerAddress: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_market", ["marketId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_whale", ["isWhale", "timestamp"]),

  // Whale activity tracking
  whaleAlerts: defineTable({
    marketId: v.string(),
    marketQuestion: v.string(),
    address: v.string(),
    action: v.string(), // "SWEEP_BUY", "SWEEP_SELL", "LARGE_ORDER"
    size: v.number(),
    priceImpact: v.number(),
    levelsSwept: v.number(),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"])
    .index("by_address", ["address"]),

  // Signal alerts
  signals: defineTable({
    marketId: v.string(),
    marketQuestion: v.string(),
    signalType: v.string(), // "UPWARD_PRESSURE", "DOWNWARD_PRESSURE", "TOXIC_SPREAD", "HIGH_VWAP_DIVERGENCE"
    severity: v.string(), // "low", "medium", "high"
    message: v.string(),
    data: v.object({
      currentValue: v.number(),
      threshold: v.number(),
      direction: v.optional(v.string()),
    }),
    timestamp: v.number(),
    acknowledged: v.boolean(),
    acknowledgedBy: v.optional(v.id("users")),
  }).index("by_timestamp", ["timestamp"])
    .index("by_market", ["marketId"])
    .index("by_acknowledged", ["acknowledged"]),

  // User watchlist
  watchlist: defineTable({
    userId: v.id("users"),
    marketId: v.string(),
    addedAt: v.number(),
    alerts: v.boolean(),
  }).index("by_user", ["userId"])
    .index("by_user_market", ["userId", "marketId"]),

  // Slippage calculations cache
  slippageCalcs: defineTable({
    marketId: v.string(),
    tradeSize500: v.object({ buy: v.number(), sell: v.number() }),
    tradeSize1000: v.object({ buy: v.number(), sell: v.number() }),
    tradeSize5000: v.object({ buy: v.number(), sell: v.number() }),
    lastUpdated: v.number(),
  }).index("by_market", ["marketId"]),
});
