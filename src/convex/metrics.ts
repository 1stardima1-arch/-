import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { sleepStagesValidator } from "./schema";

export const getToday = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const today = new Date().toISOString().slice(0, 10);
    return await ctx.db
      .query("dailyMetrics")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", today)
      )
      .first();
  },
});

export const getRange = query({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - args.days);

    const metrics = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const metric = await ctx.db
        .query("dailyMetrics")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", userId).eq("date", dateStr)
        )
        .first();
      if (metric) metrics.push(metric);
    }
    return metrics;
  },
});

export const addMetrics = mutation({
  args: {
    date: v.string(),
    hrv: v.optional(v.number()),
    restingHR: v.optional(v.number()),
    sleepStages: v.optional(sleepStagesValidator),
    sleepDuration: v.optional(v.number()),
    sleepEfficiency: v.optional(v.number()),
    bodyBattery: v.optional(v.number()),
    trainingStatus: v.optional(v.string()),
    recoveryScore: v.optional(v.number()),
    stressLevel: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("dailyMetrics")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", args.date)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return await ctx.db.insert("dailyMetrics", {
      userId,
      ...args,
    });
  },
});
