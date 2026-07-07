import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("devices")
      .withIndex("by_user_type", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const connect = mutation({
  args: {
    type: v.union(v.literal("garmin"), v.literal("polar"), v.literal("healthConnect")),
    tokenData: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("devices")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", userId).eq("type", args.type)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "connected",
        connectedAt: Date.now(),
        tokenData: args.tokenData,
      });
      return existing._id;
    }

    return await ctx.db.insert("devices", {
      userId,
      type: args.type,
      status: "connected",
      connectedAt: Date.now(),
      tokenData: args.tokenData,
    });
  },
});

export const disconnect = mutation({
  args: {
    type: v.union(v.literal("garmin"), v.literal("polar"), v.literal("healthConnect")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("devices")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", userId).eq("type", args.type)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "disconnected",
        tokenData: undefined,
      });
    }
  },
});

export const syncNow = mutation({
  args: {
    type: v.union(v.literal("garmin"), v.literal("polar"), v.literal("healthConnect")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const device = await ctx.db
      .query("devices")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", userId).eq("type", args.type)
      )
      .first();

    if (device) {
      await ctx.db.patch(device._id, { lastSync: Date.now() });
    }
    return { success: true };
  },
});
