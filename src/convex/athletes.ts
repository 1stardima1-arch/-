import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  sportValidator,
  levelValidator,
  injuryValidator,
} from "./schema";

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("athleteProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const saveProfile = mutation({
  args: {
    gender: v.union(v.literal("male"), v.literal("female"), v.literal("other")),
    age: v.number(),
    height: v.number(),
    weight: v.number(),
    sports: v.array(sportValidator),
    level: levelValidator,
    experienceYears: v.number(),
    maxHR: v.optional(v.number()),
    restingHR: v.optional(v.number()),
    ftp: v.optional(v.number()),
    thresholdPace: v.optional(v.number()),
    injuries: v.array(injuryValidator),
    chronicConditions: v.optional(v.string()),
    targetEvent: v.optional(
      v.object({
        name: v.string(),
        date: v.string(),
        targetTime: v.optional(v.string()),
        discipline: v.string(),
      })
    ),
    weeklyVolumeHours: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("athleteProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args });
      return existing._id;
    }

    const id = await ctx.db.insert("athleteProfiles", {
      userId,
      ...args,
    });

    // Mark onboarding as completed
    await ctx.db.patch(userId, { onboardingCompleted: true });

    return id;
  },
});

export const isOnboarded = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const profile = await ctx.db
      .query("athleteProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return !!profile;
  },
});
