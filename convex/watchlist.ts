import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get user's watchlist
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("watchlist")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

// Check if market is in watchlist
export const isWatching = query({
  args: { marketId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const entry = await ctx.db
      .query("watchlist")
      .withIndex("by_user_market", (q) =>
        q.eq("userId", userId).eq("marketId", args.marketId)
      )
      .first();

    return !!entry;
  },
});

// Add to watchlist
export const add = mutation({
  args: { marketId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("watchlist")
      .withIndex("by_user_market", (q) =>
        q.eq("userId", userId).eq("marketId", args.marketId)
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("watchlist", {
      userId,
      marketId: args.marketId,
      addedAt: Date.now(),
      alerts: true,
    });
  },
});

// Remove from watchlist
export const remove = mutation({
  args: { marketId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const entry = await ctx.db
      .query("watchlist")
      .withIndex("by_user_market", (q) =>
        q.eq("userId", userId).eq("marketId", args.marketId)
      )
      .first();

    if (entry) {
      await ctx.db.delete(entry._id);
    }
  },
});

// Toggle alerts
export const toggleAlerts = mutation({
  args: { marketId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const entry = await ctx.db
      .query("watchlist")
      .withIndex("by_user_market", (q) =>
        q.eq("userId", userId).eq("marketId", args.marketId)
      )
      .first();

    if (entry) {
      await ctx.db.patch(entry._id, { alerts: !entry.alerts });
    }
  },
});
