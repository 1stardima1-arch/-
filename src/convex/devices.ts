import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
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

// Store Garmin Connect credentials (email + password)
export const storeGarminCredentials = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const storedData = JSON.stringify({
      email: args.email,
      password: args.password,
    });

    const existing = await ctx.db
      .query("devices")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", userId).eq("type", "garmin")
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "connected",
        connectedAt: Date.now(),
        tokenData: storedData,
      });
      return existing._id;
    }

    return await ctx.db.insert("devices", {
      userId,
      type: "garmin",
      status: "connected",
      connectedAt: Date.now(),
      tokenData: storedData,
    });
  },
});

// Store Polar OAuth tokens (called after successful OAuth callback)
export const storePolarTokens = mutation({
  args: {
    tokenData: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("devices")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", userId).eq("type", "polar")
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
      type: "polar",
      status: "connected",
      connectedAt: Date.now(),
      tokenData: args.tokenData,
    });
  },
});

// Connect a device (Garmin: store credentials, Polar: mark as pending OAuth, HealthConnect: mark connected)
export const connect = mutation({
  args: {
    type: v.union(
      v.literal("garmin"),
      v.literal("polar"),
      v.literal("healthConnect")
    ),
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
        tokenData: args.tokenData ?? existing.tokenData,
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

// Disconnect a device
export const disconnect = mutation({
  args: {
    type: v.union(
      v.literal("garmin"),
      v.literal("polar"),
      v.literal("healthConnect")
    ),
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

// Trigger sync — schedules the appropriate internal action
export const syncNow = mutation({
  args: {
    type: v.union(
      v.literal("garmin"),
      v.literal("polar"),
      v.literal("healthConnect")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (args.type === "garmin") {
      await ctx.scheduler.runAfter(0, internal.sync.garmin.syncGarmin, {
        userId,
      });
    } else if (args.type === "polar") {
      await ctx.scheduler.runAfter(0, internal.sync.polar.syncPolar, {
        userId,
      });
    }

    return { scheduled: true };
  },
});
