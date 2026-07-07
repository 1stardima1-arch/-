import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getToday = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const today = new Date().toISOString().slice(0, 10);
    return await ctx.db
      .query("journalEntries")
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

    const entries = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const entry = await ctx.db
        .query("journalEntries")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", userId).eq("date", dateStr)
        )
        .first();
      if (entry) entries.push(entry);
    }
    return entries;
  },
});

export const logEntry = mutation({
  args: {
    date: v.string(),
    alcohol: v.optional(v.boolean()),
    caffeine: v.optional(v.boolean()),
    stress: v.optional(v.number()),
    screenBeforeSleep: v.optional(v.number()),
    notes: v.optional(v.string()),
    sleepQuality: v.optional(v.number()),
    mood: v.optional(v.number()),
    soreness: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("journalEntries")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", args.date)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return await ctx.db.insert("journalEntries", {
      userId,
      ...args,
    });
  },
});
