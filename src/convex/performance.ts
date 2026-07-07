import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getRange = query({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - args.days);

    const data = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const entry = await ctx.db
        .query("performanceData")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", userId).eq("date", dateStr)
        )
        .first();
      if (entry) data.push(entry);
    }
    return data;
  },
});

export const addEntry = mutation({
  args: {
    date: v.string(),
    ctl: v.number(),
    atl: v.number(),
    tsb: v.number(),
    tss: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("performanceData")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", args.date)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return await ctx.db.insert("performanceData", {
      userId,
      ...args,
    });
  },
});
