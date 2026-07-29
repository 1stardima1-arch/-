import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

// ─── Queries ───

export const getGarminDevice = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("devices")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", args.userId).eq("type", "garmin")
      )
      .first();
  },
});

export const getPolarDevice = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("devices")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", args.userId).eq("type", "polar")
      )
      .first();
  },
});

export const getAthyxDevice = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("devices")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", args.userId).eq("type", "athyx")
      )
      .first();
  },
});

export const getAllConnectedAthyxDevices = internalQuery({
  args: {},
  handler: async (ctx) => {
    const devices = await ctx.db.query("devices").collect();
    return devices.filter((d) => d.type === "athyx" && d.status === "connected");
  },
});

// ─── Mutations ───

export const updateDeviceToken = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.union(v.literal("garmin"), v.literal("polar"), v.literal("healthConnect"), v.literal("athyx")),
    tokenData: v.string(),
    lastSync: v.number(),
  },
  handler: async (ctx, args) => {
    const device = await ctx.db
      .query("devices")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", args.userId).eq("type", args.type)
      )
      .first();

    if (device) {
      await ctx.db.patch(device._id, {
        tokenData: args.tokenData,
        lastSync: args.lastSync,
        status: "connected",
      });
    }
  },
});

export const insertLactateReading = internalMutation({
  args: {
    userId: v.id("users"),
    timestamp: v.number(),
    lactateMM: v.number(),
    peakLactateMM: v.optional(v.number()),
    avgHR: v.optional(v.number()),
    athyxSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("lactateReadings", args);
  },
});

export const markDeviceStatus = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.union(v.literal("garmin"), v.literal("polar"), v.literal("healthConnect"), v.literal("athyx")),
    status: v.union(v.literal("connected"), v.literal("disconnected"), v.literal("unavailable")),
  },
  handler: async (ctx, args) => {
    const device = await ctx.db
      .query("devices")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", args.userId).eq("type", args.type)
      )
      .first();
    if (device) {
      await ctx.db.patch(device._id, { status: args.status });
    }
  },
});

export const upsertMetric = internalMutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    hrv: v.optional(v.number()),
    restingHR: v.optional(v.number()),
    sleepDuration: v.optional(v.number()),
    sleepEfficiency: v.optional(v.number()),
    bodyBattery: v.optional(v.number()),
    stressLevel: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dailyMetrics")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("dailyMetrics", args);
    }
  },
});

export const upsertActivity = internalMutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    sport: v.string(),
    distance: v.optional(v.number()),
    duration: v.number(),
    pace: v.optional(v.number()),
    avgHR: v.optional(v.number()),
    maxHR: v.optional(v.number()),
    tss: v.optional(v.number()),
    calories: v.optional(v.number()),
    elevation: v.optional(v.number()),
    title: v.optional(v.string()),
    planned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("trainingActivities")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .filter((q) => q.eq(q.field("title"), args.title))
      .first();

    // Combined sport mapping (handles both Garmin lowercase and Polar uppercase)
    const sportMap: Record<string, string> = {
      running: "running",
      cycling: "cycling",
      swimming: "swimming",
      cross_country_skiing: "skiing",
      RUNNING: "running",
      CYCLING: "cycling",
      SWIMMING: "swimming",
      CROSS_COUNTRY_SKIING: "skiing",
      OTHER: "other",
    };
    const mappedSport = (sportMap[args.sport] || "other") as
      | "running"
      | "cycling"
      | "swimming"
      | "skiing"
      | "triathlon"
      | "other";

    if (existing) {
      await ctx.db.patch(existing._id, {
        distance: args.distance,
        duration: args.duration,
        pace: args.pace,
        avgHR: args.avgHR,
        maxHR: args.maxHR,
        tss: args.tss,
        calories: args.calories,
        elevation: args.elevation,
      });
    } else {
      await ctx.db.insert("trainingActivities", {
        userId: args.userId,
        date: args.date,
        sport: mappedSport,
        distance: args.distance,
        duration: args.duration,
        pace: args.pace,
        avgHR: args.avgHR,
        maxHR: args.maxHR,
        tss: args.tss,
        calories: args.calories,
        elevation: args.elevation,
        title: args.title,
        planned: args.planned ?? false,
      });
    }
  },
});
