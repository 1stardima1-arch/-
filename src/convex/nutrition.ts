import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getTodayLog = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const today = new Date().toISOString().slice(0, 10);
    return await ctx.db
      .query("nutritionLog")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", today)
      )
      .collect();
  },
});

export const getTodayTargets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const today = new Date().toISOString().slice(0, 10);
    return await ctx.db
      .query("nutritionTargets")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", today)
      )
      .first();
  },
});

export const logMeal = mutation({
  args: {
    date: v.string(),
    mealType: v.union(
      v.literal("breakfast"),
      v.literal("lunch"),
      v.literal("dinner"),
      v.literal("snack"),
      v.literal("preWorkout"),
      v.literal("postWorkout")
    ),
    foods: v.array(
      v.object({
        name: v.string(),
        calories: v.optional(v.number()),
        protein: v.optional(v.number()),
        carbs: v.optional(v.number()),
        fat: v.optional(v.number()),
        amount: v.optional(v.string()),
      })
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const totalCalories = args.foods.reduce(
      (sum, f) => sum + (f.calories ?? 0),
      0
    );
    const totalProtein = args.foods.reduce(
      (sum, f) => sum + (f.protein ?? 0),
      0
    );
    const totalCarbs = args.foods.reduce(
      (sum, f) => sum + (f.carbs ?? 0),
      0
    );
    const totalFat = args.foods.reduce(
      (sum, f) => sum + (f.fat ?? 0),
      0
    );

    return await ctx.db.insert("nutritionLog", {
      userId,
      date: args.date,
      mealType: args.mealType,
      foods: args.foods,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      notes: args.notes,
    });
  },
});

export const deleteMeal = mutation({
  args: { id: v.id("nutritionLog") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const setTargets = mutation({
  args: {
    date: v.string(),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    waterMl: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("nutritionTargets")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", args.date)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return await ctx.db.insert("nutritionTargets", {
      userId,
      ...args,
    });
  },
});
