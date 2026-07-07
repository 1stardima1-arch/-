import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { eventPriorityValidator } from "./schema";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("events")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();
  },
});

export const getUpcoming = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const today = new Date().toISOString().slice(0, 10);
    const all = await ctx.db
      .query("events")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();
    return all.filter((e) => !e.completed && e.date >= today);
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    date: v.string(),
    discipline: v.string(),
    targetTime: v.optional(v.string()),
    priority: eventPriorityValidator,
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("events", {
      userId,
      ...args,
      completed: false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("events"),
    name: v.optional(v.string()),
    date: v.optional(v.string()),
    discipline: v.optional(v.string()),
    targetTime: v.optional(v.string()),
    priority: v.optional(eventPriorityValidator),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    completed: v.optional(v.boolean()),
    result: v.optional(
      v.object({
        time: v.string(),
        pace: v.optional(v.number()),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
