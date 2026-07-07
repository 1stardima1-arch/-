"use node";

import { action, internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

// ─── Types ───

interface PolarTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: number; // Polar user ID
}

interface PolarTrainingSession {
  id: number;
  startTime: string;
  duration: string; // ISO 8601 duration
  distance?: number; // meters
  calories?: number;
  sport: string;
  hrAvg?: number;
  hrMax?: number;
  trainingLoad?: number;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseISODuration(duration: string): number {
  // Parse ISO 8601 duration like "PT1H30M15S" → minutes
  const match = duration.match(
    /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/
  );
  if (!match) return 0;
  const days = parseInt(match[1] || "0");
  const hours = parseInt(match[2] || "0");
  const minutes = parseInt(match[3] || "0");
  const seconds = parseFloat(match[4] || "0");
  return days * 1440 + hours * 60 + minutes + seconds / 60;
}

// ─── Internal mutations ───

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

// ─── Polar API helpers ───

const POLAR_AUTH_URL = "https://auth.polar.com/oauth/token";
const POLAR_API_BASE = "https://www.polaraccesslink.com/v4";

function getPolarCredentials() {
  const clientId = process.env.POLAR_CLIENT_ID;
  const clientSecret = process.env.POLAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Polar credentials not configured. Set POLAR_CLIENT_ID and POLAR_CLIENT_SECRET environment variables."
    );
  }
  return { clientId, clientSecret };
}

async function refreshPolarToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
  const { clientId, clientSecret } = getPolarCredentials();

  const res = await fetch(POLAR_AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Polar token refresh failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

async function polarApiRequest(
  accessToken: string,
  path: string
): Promise<unknown> {
  const res = await fetch(`${POLAR_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (res.status === 204) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Polar API error: ${res.status} ${text}`);
  }
  return res.json();
}

// ─── Actions ───

// Exchange OAuth authorization code for tokens (called after user authorizes from frontend)
export const exchangePolarCode = action({
  args: {
    userId: v.id("users"),
    code: v.string(),
    redirectUri: v.string(),
  },
  handler: async (ctx, args) => {
    const { clientId, clientSecret } = getPolarCredentials();

    const res = await fetch(POLAR_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: args.code,
        redirect_uri: args.redirectUri,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        error: `Polar authorization failed: ${res.status} ${text}`,
      };
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      x_user_id: number;
    };

    const tokens: PolarTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      userId: data.x_user_id,
    };

    // Store tokens
    await ctx.runMutation(internal.sync.polar.updateDeviceToken, {
      userId: args.userId,
      type: "polar",
      tokenData: JSON.stringify(tokens),
      lastSync: Date.now(),
    });

    return { success: true };
  },
});

// Main Polar sync action
export const syncPolar = internalAction({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = args;

    // 1. Get stored tokens
    const device = await ctx.runQuery(internal.sync.polar.getPolarDevice, {
      userId,
    });

    if (!device?.tokenData) {
      return {
        success: false,
        error: "Polar not connected. Please connect your Polar account first.",
      };
    }

    let tokens: PolarTokens;
    try {
      tokens = JSON.parse(device.tokenData);
    } catch {
      return {
        success: false,
        error: "Invalid Polar token data. Please reconnect.",
      };
    }

    // 2. Refresh token if expired
    if (Date.now() >= tokens.expiresAt) {
      try {
        const fresh = await refreshPolarToken(tokens.refreshToken);
        tokens = { ...tokens, ...fresh };
        await ctx.runMutation(internal.sync.polar.updateDeviceToken, {
          userId,
          type: "polar",
          tokenData: JSON.stringify(tokens),
          lastSync: Date.now(),
        });
      } catch (e) {
        return {
          success: false,
          error: `Polar token refresh failed: ${e instanceof Error ? e.message : "unknown error"}. Please reconnect Polar.`,
        };
      }
    }

    const results: string[] = [];
    const now = Date.now();

    // 3. Fetch training sessions (last 30 days)
    try {
      const sessions = (await polarApiRequest(
        tokens.accessToken,
        "/training-sessions"
      )) as PolarTrainingSession[] | null;

      if (sessions && sessions.length > 0) {
        let importedCount = 0;
        for (const session of sessions) {
          const sessionDate = session.startTime?.slice(0, 10);
          if (!sessionDate) continue;

          const durationMin = parseISODuration(session.duration);
          const distanceKm = session.distance
            ? session.distance / 1000
            : undefined;
          const pace =
            distanceKm && durationMin > 0
              ? durationMin / distanceKm
              : undefined;

          await ctx.runMutation(internal.sync.polar.upsertActivity, {
            userId,
            date: sessionDate,
            sport: session.sport || "OTHER",
            distance: distanceKm,
            duration: durationMin,
            pace,
            avgHR: session.hrAvg,
            maxHR: session.hrMax,
            tss: session.trainingLoad,
            calories: session.calories,
            title: `${session.sport || "Training"} — ${sessionDate}`,
            planned: false,
          });
          importedCount++;
        }
        results.push(`Imported ${importedCount} training sessions`);
      }
    } catch (e) {
      results.push(
        `Training: ${e instanceof Error ? e.message : "unable to fetch"}`
      );
    }

    // 4. Fetch sleep data
    try {
      const sleeps = (await polarApiRequest(
        tokens.accessToken,
        "/sleeps"
      )) as Array<{
        date: string;
        sleepDuration?: number; // seconds
        sleepScore?: number;
      }> | null;

      if (sleeps && sleeps.length > 0) {
        let sleepDays = 0;
        for (const sleep of sleeps) {
          if (!sleep.date) continue;
          const durationHours = sleep.sleepDuration
            ? sleep.sleepDuration / 3600
            : undefined;

          await ctx.runMutation(internal.sync.polar.upsertMetric, {
            userId,
            date: sleep.date,
            sleepDuration: durationHours,
            sleepEfficiency: sleep.sleepScore,
          });
          sleepDays++;
        }
        if (sleepDays > 0) results.push(`Imported ${sleepDays} nights of sleep`);
      }
    } catch (e) {
      results.push(
        `Sleep: ${e instanceof Error ? e.message : "unable to fetch"}`
      );
    }

    // 5. Fetch Nightly Recharge (HRV + ANS)
    try {
      const recharge = (await polarApiRequest(
        tokens.accessToken,
        "/nightly-recharge-results"
      )) as Array<{
        date: string;
        hrv?: number;
        ansCharge?: number;
      }> | null;

      if (recharge && recharge.length > 0) {
        let hrvDays = 0;
        for (const r of recharge) {
          if (!r.date) continue;
          await ctx.runMutation(internal.sync.polar.upsertMetric, {
            userId,
            date: r.date,
            hrv: r.hrv,
            bodyBattery: r.ansCharge,
          });
          hrvDays++;
        }
        if (hrvDays > 0) results.push(`Imported ${hrvDays} days of HRV/recovery`);
      }
    } catch (e) {
      results.push(
        `Recovery: ${e instanceof Error ? e.message : "unable to fetch"}`
      );
    }

    // 6. Update last sync timestamp
    await ctx.runMutation(internal.sync.polar.updateDeviceToken, {
      userId,
      type: "polar",
      tokenData: JSON.stringify(tokens),
      lastSync: now,
    });

    return {
      success: true,
      syncedAt: now,
      details: results,
    };
  },
});
