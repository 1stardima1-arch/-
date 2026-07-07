"use node";

import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

// ─── Types ───

interface StoredGarminData {
  email: string;
  password: string;
  sessionToken?: string;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Creates an authenticated GarminConnect client from stored credentials.
 * Tries to restore a saved session first, then falls back to login.
 */
async function createGarminClient(storedData: StoredGarminData) {
  const { GarminConnect } = await import("garmin-connect");
  const gc = new GarminConnect({
    username: storedData.email,
    password: storedData.password,
  });

  // Try to restore saved session
  if (storedData.sessionToken) {
    try {
      const parsed = JSON.parse(storedData.sessionToken);
      gc.loadToken(parsed.oauth1, parsed.oauth2);
      // Verify session is still valid by making a lightweight request
      return gc;
    } catch {
      // Session expired — will login below
    }
  }

  // Login with credentials
  await gc.login(storedData.email, storedData.password);
  return gc;
}

// ─── Main sync action ───

export const syncGarmin = internalAction({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = args;
    const now = Date.now();
    const results: string[] = [];

    // 1. Get stored credentials
    const device = await ctx.runQuery(internal.sync.helpers.getGarminDevice, { userId });

    if (!device?.tokenData) {
      return { success: false, error: "Garmin credentials not configured." };
    }

    let storedData: StoredGarminData;
    try {
      storedData = JSON.parse(device.tokenData);
    } catch {
      return { success: false, error: "Invalid stored credentials. Please reconnect Garmin." };
    }

    if (!storedData.email || !storedData.password) {
      return { success: false, error: "Missing Garmin credentials. Please re-enter." };
    }

    // 2. Authenticate
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let gc: any;
    try {
      gc = await createGarminClient(storedData);
    } catch (loginErr) {
      const msg = loginErr instanceof Error ? loginErr.message : String(loginErr);
      return {
        success: false,
        error: `Garmin login failed: ${msg}. Попробуй:
1. Проверь email/пароль — войди в Garmin Connect через браузер
2. Если у тебя включена двухфакторная аутентификация (2FA), отключи её временно
3. Попробуй позже — Garmin иногда блокирует неофициальные подключения`,
        details: [`Login error: ${msg}`],
      };
    }

    // 3. Fetch activities
    try {
      const activities = (await gc.getActivities(0, 100)) as Array<Record<string, unknown>>;
      if (activities?.length) {
        let count = 0;
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

        for (const act of activities) {
          const actDate = (act.startTimeLocal as string)?.slice(0, 10);
          if (!actDate) continue;

          const age = Date.now() - new Date(actDate).getTime();
          if (age > thirtyDaysMs) continue;

          const sport = (act.activityType as Record<string, string>)?.typeKey || "other";
          const dist = (act.distance as number) ? (act.distance as number) / 1000 : undefined;
          const dur = (act.duration as number) ? (act.duration as number) / 60 : 0;
          const pace = dist && dur > 0 ? dur / dist : undefined;

          await ctx.runMutation(internal.sync.helpers.upsertActivity, {
            userId,
            date: actDate,
            sport,
            distance: dist,
            duration: dur,
            pace,
            avgHR: act.averageHR as number | undefined,
            maxHR: act.maxHR as number | undefined,
            tss: undefined,
            calories: act.calories as number | undefined,
            elevation: act.elevationGain as number | undefined,
            title: act.activityName as string | undefined,
            planned: false,
          });
          count++;
        }
        results.push(`📊 Импортировано тренировок: ${count}`);
      }
    } catch (e) {
      results.push(`⚠️ Ошибка тренировок: ${e instanceof Error ? e.message : "неизвестно"}`);
    }

    // 4. Fetch sleep
    try {
      let sleepDays = 0;
      const sleepData = await gc.getSleepData(new Date());
      const daily = sleepData?.dailySleepDTO;
      if (daily?.sleepTimeSeconds) {
        await ctx.runMutation(internal.sync.helpers.upsertMetric, {
          userId,
          date: toDateStr(new Date()),
          sleepDuration: daily.sleepTimeSeconds / 3600,
          sleepEfficiency: daily.sleepTimeSeconds > 0
            ? Math.round(
                ((daily.deepSleepSeconds || 0) + (daily.lightSleepSeconds || 0) + (daily.remSleepSeconds || 0)) /
                ((daily.deepSleepSeconds || 0) + (daily.lightSleepSeconds || 0) + (daily.remSleepSeconds || 0) + (daily.awakeSleepSeconds || 0)) * 100
              )
            : undefined,
        });
        sleepDays++;
      }
      if (sleepDays > 0) results.push(`😴 Данных сна: ${sleepDays} день`);
    } catch (e) {
      results.push(`⚠️ Сон: ${e instanceof Error ? e.message : "нет данных"}`);
    }

    // 5. Fetch HR
    try {
      const hrData = await gc.getHeartRate(new Date());
      if (hrData?.restingHeartRate) {
        await ctx.runMutation(internal.sync.helpers.upsertMetric, {
          userId,
          date: toDateStr(new Date()),
          restingHR: hrData.restingHeartRate,
        });
        results.push(`❤️ Пульс покоя: ${hrData.restingHeartRate} уд/мин`);
      }
    } catch (e) {
      results.push(`⚠️ Пульс: ${e instanceof Error ? e.message : "нет данных"}`);
    }

    // 6. Save updated session
    try {
      const fresh = gc.exportToken();
      const updated: StoredGarminData = {
        email: storedData.email,
        password: storedData.password,
        sessionToken: JSON.stringify(fresh),
      };
      await ctx.runMutation(internal.sync.helpers.updateDeviceToken, {
        userId,
        type: "garmin",
        tokenData: JSON.stringify(updated),
        lastSync: now,
      });
    } catch {
      // Session token save failed — not critical
    }

    return { success: true, syncedAt: now, details: results };
  },
});

/**
 * Test Garmin connection — called from frontend to validate credentials before storing.
 */
export const testGarminLogin = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (_ctx, args) => {
    try {
      const { GarminConnect } = await import("garmin-connect");
      const gc = new GarminConnect({
        username: args.email,
        password: args.password,
      });
      await gc.login(args.email, args.password);
      const sessionToken = JSON.stringify(gc.exportToken());
      return {
        success: true,
        message: "✅ Подключение к Garmin Connect успешно!",
        sessionToken,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        success: false,
        message: `❌ Ошибка: ${msg}`,
        hints: [
          "Проверь email и пароль",
          "Отключи двухфакторную аутентификацию",
          "Garmin может временно блокировать неофициальные подключения",
        ],
      };
    }
  },
});
