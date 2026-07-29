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

// Store Garmin Connect credentials (email + password + session token)
export const storeGarminCredentials = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const storedData = JSON.stringify({
      email: args.email,
      password: args.password,
      sessionToken: args.sessionToken || undefined,
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

// Store Athyx API key (read-only key from athyx.com/developers)
export const storeAthyxApiKey = mutation({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("devices")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", userId).eq("type", "athyx")
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "connected",
        connectedAt: Date.now(),
        tokenData: args.apiKey,
      });
      return existing._id;
    }

    return await ctx.db.insert("devices", {
      userId,
      type: "athyx",
      status: "connected",
      connectedAt: Date.now(),
      tokenData: args.apiKey,
    });
  },
});

// Latest lactate reading for the current user — polled by the frontend and
// relayed to the paired Garmin watch app over the Connect IQ bridge.
export const getLatestLactate = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const reading = await ctx.db
      .query("lactateReadings")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    if (!reading) return null;
    return {
      lactateMM: reading.lactateMM,
      peakLactateMM: reading.peakLactateMM,
      avgHR: reading.avgHR,
      timestamp: reading.timestamp,
      ageSeconds: Math.round((Date.now() - reading.timestamp) / 1000),
    };
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
      v.literal("healthConnect"),
      v.literal("athyx")
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
      v.literal("healthConnect"),
      v.literal("athyx")
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
    } else if (args.type === "athyx") {
      await ctx.scheduler.runAfter(0, internal.sync.athyx.syncAthyx, {
        userId,
      });
    }

    return { scheduled: true };
  },
});
