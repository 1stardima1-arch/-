import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { sportValidator, hrZoneValidator } from "./schema";

export const list = query({
  args: {
    sport: v.optional(sportValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (args.sport) {
      return await ctx.db
        .query("trainingActivities")
        .withIndex("by_user_sport", (q) =>
          q.eq("userId", userId).eq("sport", args.sport!)
        )
        .order("desc")
        .take(args.limit ?? 50);
    }

    return await ctx.db
      .query("trainingActivities")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const getById = query({
  args: { id: v.id("trainingActivities") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const add = mutation({
  args: {
    date: v.string(),
    sport: sportValidator,
    distance: v.optional(v.number()),
    duration: v.number(),
    pace: v.optional(v.number()),
    avgHR: v.optional(v.number()),
    maxHR: v.optional(v.number()),
    hrZones: v.optional(v.array(hrZoneValidator)),
    tss: v.optional(v.number()),
    notes: v.optional(v.string()),
    planned: v.boolean(),
    title: v.optional(v.string()),
    elevation: v.optional(v.number()),
    calories: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("trainingActivities", {
      userId,
      ...args,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("trainingActivities") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
