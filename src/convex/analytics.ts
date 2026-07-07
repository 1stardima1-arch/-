import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getCurrentUser } from "./users";

const ADMIN_EMAIL = "starostin.dima2010@gmail.com";

/**
 * Ensure the current user has admin role if their email matches ADMIN_EMAIL.
 * Safe to call on every page load — only mutates once.
 */
export const ensureAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user?.email) return { promoted: false };

    if (user.email === ADMIN_EMAIL && user.role !== "admin") {
      await ctx.db.patch(user._id, { role: "admin" });
      return { promoted: true };
    }
    return { promoted: false };
  },
});

/**
 * Get the current user's role — "admin", "user", or null if not logged in.
 */
export const getRole = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return (user.role as string) ?? "user";
  },
});

/**
 * Track an analytics event.
 * Call from frontend for page views, feature usage, etc.
 */
export const trackEvent = mutation({
  args: {
    event: v.string(),
    path: v.optional(v.string()),
    properties: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    await ctx.db.insert("analyticsEvents", {
      userId: userId ?? undefined,
      event: args.event,
      path: args.path,
      properties: args.properties,
      timestamp: Date.now(),
    });
  },
});

// ─── Admin analytics queries ───

/**
 * Get total user count.
 */
export const getUserCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user?.role !== "admin") throw new Error("Not authorized");

    const users = await ctx.db.query("users").collect();
    return {
      total: users.length,
      anonymous: users.filter((u) => u.isAnonymous).length,
      verified: users.filter((u) => u.emailVerificationTime).length,
    };
  },
});

/**
 * Get event counts grouped by event name.
 */
export const getEventCounts = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user?.role !== "admin") throw new Error("Not authorized");

    const events = await ctx.db.query("analyticsEvents").collect();
    const counts: Record<string, number> = {};
    for (const e of events) {
      counts[e.event] = (counts[e.event] || 0) + 1;
    }
    return counts;
  },
});

/**
 * Get daily event counts for the last N days.
 */
export const getDailyStats = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user?.role !== "admin") throw new Error("Not authorized");

    const days = args.days ?? 30;
    const cutoff = Date.now() - days * 86400000;
    const events = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", cutoff))
      .collect();

    // Group by date
    const daily: Record<string, Record<string, number>> = {};
    for (const e of events) {
      const dateKey = new Date(e.timestamp).toISOString().slice(0, 10);
      if (!daily[dateKey]) daily[dateKey] = { total: 0 };
      daily[dateKey].total = (daily[dateKey].total || 0) + 1;
      daily[dateKey][e.event] = (daily[dateKey][e.event] || 0) + 1;
    }

    // Fill in missing dates
    const result: Array<{ date: string; total: number; [key: string]: number | string }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      result.push({ date: d, total: daily[d]?.total ?? 0, ...daily[d] });
    }
    return result;
  },
});

/**
 * Get device connection stats (admin only).
 */
export const getDeviceStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user?.role !== "admin") throw new Error("Not authorized");

    const devices = await ctx.db.query("devices").collect();
    return {
      total: devices.length,
      connected: devices.filter((d) => d.status === "connected").length,
      byType: {
        garmin: devices.filter((d) => d.type === "garmin").length,
        polar: devices.filter((d) => d.type === "polar").length,
        healthConnect: devices.filter((d) => d.type === "healthConnect").length,
      },
    };
  },
});

/**
 * Get recent events log (admin only).
 */
export const getRecentEvents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user?.role !== "admin") throw new Error("Not authorized");

    const limit = args.limit ?? 50;
    const events = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
    return events;
  },
});
