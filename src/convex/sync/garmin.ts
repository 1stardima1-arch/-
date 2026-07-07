"use node";

import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

// ─── Types ───

interface GarminTokens {
  oauth1: unknown;
  oauth2: unknown;
}

interface StoredGarminData {
  email: string;
  password: string;
  sessionToken?: GarminTokens;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Internal mutations (exported so they're registered) ───

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

    const sportMap: Record<string, string> = {
      running: "running",
      cycling: "cycling",
      swimming: "swimming",
      cross_country_skiing: "skiing",
      other: "other",
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

export const updateDeviceToken = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.union(v.literal("garmin"), v.literal("polar"), v.literal("healthConnect")),
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

// ─── Main sync action ───

export const syncGarmin = internalAction({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = args;

    // 1. Get stored credentials
    const device = await ctx.runQuery(internal.sync.garmin.getGarminDevice, {
      userId,
    });

    if (!device?.tokenData) {
      return {
        success: false,
        error: "Garmin credentials not configured. Please add your Garmin Connect credentials.",
      };
    }

    let storedData: StoredGarminData;
    try {
      storedData = JSON.parse(device.tokenData);
    } catch {
      return {
        success: false,
        error: "Invalid stored credentials. Please reconnect Garmin.",
      };
    }

    if (!storedData.email || !storedData.password) {
      return {
        success: false,
        error: "Missing Garmin credentials. Please re-enter your email and password.",
      };
    }

    // 2. Initialize GarminConnect
    const { GarminConnect } = await import("garmin-connect");
    const gc = new GarminConnect({
      username: storedData.email,
      password: storedData.password,
    });

    // 3. Authenticate (restore session or login)
    try {
      if (storedData.sessionToken) {
        try {
          gc.loadToken(
            storedData.sessionToken.oauth1 as never,
            storedData.sessionToken.oauth2 as never,
          );
        } catch {
          await gc.login(storedData.email, storedData.password);
        }
      } else {
        await gc.login(storedData.email, storedData.password);
      }
    } catch (loginErr) {
      const msg =
        loginErr instanceof Error ? loginErr.message : String(loginErr);
      return {
        success: false,
        error: `Garmin login failed: ${msg}. Check your credentials — they must be your Garmin Connect email and password.`,
      };
    }

    const results: string[] = [];
    const now = Date.now();

    // 4. Fetch activities for last 30 days
    try {
      const activities = await gc.getActivities(0, 100);
      if (activities && activities.length > 0) {
        let importedCount = 0;
        for (const act of activities) {
          const actDate = act.startTimeLocal?.slice(0, 10);
          if (!actDate) continue;

          const actDateObj = new Date(actDate);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (actDateObj < thirtyDaysAgo) continue;

          const sportType = act.activityType?.typeKey || "other";
          const distance = act.distance ? act.distance / 1000 : undefined;
          const duration = act.duration ? act.duration / 60 : 0;
          const pace =
            distance && duration > 0 ? duration / distance : undefined;
          const avgHR = act.averageHR ?? undefined;
          const maxHR = act.maxHR ?? undefined;
          const calories = act.calories ?? undefined;
          const elevation = act.elevationGain ?? undefined;

          await ctx.runMutation(internal.sync.garmin.upsertActivity, {
            userId,
            date: actDate,
            sport: sportType,
            distance,
            duration,
            pace,
            avgHR,
            maxHR,
            calories,
            elevation,
            title: act.activityName || undefined,
            planned: false,
          });
          importedCount++;
        }
        results.push(`Imported ${importedCount} activities`);
      }
    } catch (e) {
      results.push(
        `Activities: ${e instanceof Error ? e.message : "unable to fetch"}`
      );
    }

    // 5. Fetch sleep data for last 7 days
    try {
      let sleepDays = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = toDateStr(d);
        try {
          const sleep = await gc.getSleepData(d);
          if (sleep?.dailySleepDTO?.sleepTimeSeconds) {
            const durationHours = sleep.dailySleepDTO.sleepTimeSeconds / 3600;
            // Calculate efficiency: total sleep time / (deep+light+rem+awake) ≈ efficiency
            const totalSleepStages =
              (sleep.dailySleepDTO.deepSleepSeconds || 0) +
              (sleep.dailySleepDTO.lightSleepSeconds || 0) +
              (sleep.dailySleepDTO.remSleepSeconds || 0) +
              (sleep.dailySleepDTO.awakeSleepSeconds || 0);
            const efficiency =
              totalSleepStages > 0
                ? Math.round(
                    ((sleep.dailySleepDTO.deepSleepSeconds || 0) +
                      (sleep.dailySleepDTO.lightSleepSeconds || 0) +
                      (sleep.dailySleepDTO.remSleepSeconds || 0)) /
                      totalSleepStages *
                      100
                  )
                : undefined;

            await ctx.runMutation(internal.sync.garmin.upsertMetric, {
              userId,
              date: dateStr,
              sleepDuration: durationHours,
              sleepEfficiency: efficiency,
            });
            sleepDays++;
          }
        } catch {
          // No sleep data for this day
        }
      }
      if (sleepDays > 0) results.push(`Imported ${sleepDays} days of sleep data`);
    } catch (e) {
      results.push(
        `Sleep: ${e instanceof Error ? e.message : "unable to fetch"}`
      );
    }

    // 6. Fetch HR data for last 7 days
    try {
      let hrDays = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = toDateStr(d);
        try {
          const hrData = await gc.getHeartRate(d);
          if (hrData?.restingHeartRate) {
            await ctx.runMutation(internal.sync.garmin.upsertMetric, {
              userId,
              date: dateStr,
              restingHR: hrData.restingHeartRate,
            });
            hrDays++;
          }
        } catch {
          // No HR data for this day
        }
      }
      if (hrDays > 0) results.push(`Imported ${hrDays} days of HR data`);
    } catch (e) {
      results.push(
        `HR: ${e instanceof Error ? e.message : "unable to fetch"}`
      );
    }

    // 7. Save updated session token
    try {
      const freshToken = gc.exportToken();
      const updatedData: StoredGarminData = {
        email: storedData.email,
        password: storedData.password,
        sessionToken: freshToken,
      };
      await ctx.runMutation(internal.sync.garmin.updateDeviceToken, {
        userId,
        type: "garmin",
        tokenData: JSON.stringify(updatedData),
        lastSync: now,
      });
    } catch {
      results.push("(Session token not refreshed — will re-login next sync)");
    }

    return {
      success: true,
      syncedAt: now,
      details: results,
    };
  },
});
