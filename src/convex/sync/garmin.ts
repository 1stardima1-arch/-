"use node";

import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Main sync action ───

export const syncGarmin = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId } = args;
    const now = Date.now();
    const logs: string[] = [];

    // 1. Get stored credentials
    const device = await ctx.runQuery(internal.sync.helpers.getGarminDevice, { userId });
    if (!device?.tokenData) {
      return { success: false, error: "Garmin не настроен. Добавь устройство на странице Устройства.", syncedAt: now, details: [] };
    }

    let stored: { email: string; password: string; sessionToken?: string };
    try { stored = JSON.parse(device.tokenData); } catch {
      return { success: false, error: "Повреждённые данные Garmin. Переподключи устройство.", syncedAt: now, details: [] };
    }
    if (!stored.email || !stored.password) {
      return { success: false, error: "Нет креденшелов Garmin. Переподключи устройство.", syncedAt: now, details: [] };
    }

    // 2. Create client with session restore or fresh login
    const { GarminConnect } = await import("garmin-connect");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gc = new (GarminConnect as any)({ username: stored.email, password: stored.password });

    try {
      if (stored.sessionToken) {
        try {
          const parsed = JSON.parse(stored.sessionToken);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (gc as any).loadToken(parsed.oauth1, parsed.oauth2);
          logs.push("📡 Сессия Garmin восстановлена");
        } catch {
          logs.push("📡 Сессия истекла — логинимся заново");
          await gc.login(stored.email, stored.password);
        }
      } else {
        logs.push("📡 Первый вход в Garmin Connect");
        await gc.login(stored.email, stored.password);
      }
    } catch (loginErr: unknown) {
      const msg = loginErr instanceof Error ? loginErr.message : String(loginErr);
      return {
        success: false,
        error: `❌ Garmin login: ${msg.slice(0, 200)}`,
        syncedAt: now,
        details: logs,
      };
    }

    // 3. Fetch activities (last 30 days)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activities = await (gc as any).getActivities(0, 100);
      if (activities?.length) {
        let count = 0;
        const cutoff = Date.now() - 30 * 86400000;
        for (const act of activities) {
          const actDate = (act.startTimeLocal as string)?.slice(0, 10);
          if (!actDate || new Date(actDate).getTime() < cutoff) continue;

          const sport = (act.activityType as Record<string, string>)?.typeKey || "other";
          const dist = (act.distance as number) ? (act.distance as number) / 1000 : undefined;
          const dur = (act.duration as number) ? (act.duration as number) / 60 : 0;
          const pace = dist && dur > 0 ? dur / dist : undefined;

          await ctx.runMutation(internal.sync.helpers.upsertActivity, {
            userId, date: actDate, sport,
            distance: dist, duration: dur, pace,
            avgHR: act.averageHR as number | undefined,
            maxHR: act.maxHR as number | undefined,
            calories: act.calories as number | undefined,
            elevation: act.elevationGain as number | undefined,
            title: (act.activityName as string) || `${sport} — ${actDate}`,
            planned: false,
          });
          count++;
        }
        logs.push(`🏃 Тренировок: ${count}`);
      } else {
        logs.push("🏃 Тренировок за 30 дней не найдено");
      }
    } catch (e: unknown) {
      logs.push(`⚠️ Тренировки: ${e instanceof Error ? e.message.slice(0, 80) : "ошибка"}`);
    }

    // 4. Fetch sleep
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sleepData = await (gc as any).getSleepData(new Date());
      const daily = sleepData?.dailySleepDTO as Record<string, unknown> | undefined;
      if (daily?.sleepTimeSeconds) {
        const deep = (daily.deepSleepSeconds as number) || 0;
        const light = (daily.lightSleepSeconds as number) || 0;
        const rem = (daily.remSleepSeconds as number) || 0;
        const awake = (daily.awakeSleepSeconds as number) || 0;
        const totalSleep = deep + light + rem;
        const totalInBed = totalSleep + awake;

        await ctx.runMutation(internal.sync.helpers.upsertMetric, {
          userId,
          date: toDateStr(new Date()),
          sleepDuration: (daily.sleepTimeSeconds as number) / 3600,
          sleepEfficiency: totalInBed > 0 ? Math.round((totalSleep / totalInBed) * 100) : undefined,
          hrv: sleepData.avgOvernightHrv as number | undefined,
        });
        logs.push(`😴 Сон: ${Math.round((daily.sleepTimeSeconds as number) / 3600)}ч (эфф. ${totalInBed > 0 ? Math.round((totalSleep / totalInBed) * 100) : "?"}%)`);
      }
    } catch (e: unknown) {
      logs.push(`⚠️ Сон: ${e instanceof Error ? e.message.slice(0, 80) : "нет данных"}`);
    }

    // 5. Resting HR
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hr = await (gc as any).getHeartRate(new Date());
      if (hr?.restingHeartRate) {
        await ctx.runMutation(internal.sync.helpers.upsertMetric, {
          userId, date: toDateStr(new Date()),
          restingHR: hr.restingHeartRate as number,
        });
        logs.push(`❤️ Пульс покоя: ${hr.restingHeartRate}`);
      }
    } catch (e: unknown) {
      logs.push(`⚠️ Пульс: ${e instanceof Error ? e.message.slice(0, 80) : "нет данных"}`);
    }

    // 6. Save updated session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fresh = (gc as any).exportToken();
    const updated = JSON.stringify({
      email: stored.email,
      password: stored.password,
      sessionToken: JSON.stringify(fresh),
    });
    await ctx.runMutation(internal.sync.helpers.updateDeviceToken, {
      userId, type: "garmin", tokenData: updated, lastSync: now,
    });

    return { success: true, syncedAt: now, details: logs };
  },
});

// ─── Test connection action ───

export const testGarminLogin = action({
  args: { email: v.string(), password: v.string() },
  handler: async (_ctx, args) => {
    try {
      const { GarminConnect } = await import("garmin-connect");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gc = new (GarminConnect as any)({ username: args.email, password: args.password });
      await gc.login(args.email, args.password);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const token = (gc as any).exportToken();
      return {
        success: true,
        message: "✅ Garmin Connect — успешно",
        sessionToken: JSON.stringify(token),
        hints: [],
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        success: false,
        message: `❌ Garmin: ${msg.slice(0, 200)}`,
        sessionToken: undefined,
        hints: [
          "Проверь email/пароль на connect.garmin.com",
          "Отключи двухфакторку (2FA) временно",
          "Garmin может блокировать неофициальные подключения — попробуй позже",
          "Альтернатива: используй Polar (официальный OAuth2)",
        ],
      };
    }
  },
});
