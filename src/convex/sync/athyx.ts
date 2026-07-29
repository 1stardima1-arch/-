"use node";

import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

const ATHYX_API_BASE = "https://api.athyx.com/v1";

// The Athyx API is documented (athyx.com/developers) as read-only, four
// endpoints, auth via `Authorization: Bearer ath_live_...`. The field names
// below match the documented /sessions response but the API is defensive
// about it in case of drift (e.g. nested "lactate" objects instead of flat
// "avg_lactate_mM" keys).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractLactate(session: any): {
  lactateMM?: number;
  peakLactateMM?: number;
  avgHR?: number;
  timestamp?: number;
  sessionId?: string;
} {
  const avg =
    session?.avg_lactate_mM ??
    session?.avgLactateMM ??
    session?.lactate?.avg_mM ??
    session?.biometrics?.avg_lactate_mM;
  const peak =
    session?.peak_lactate_mM ??
    session?.peakLactateMM ??
    session?.lactate?.peak_mM ??
    session?.biometrics?.peak_lactate_mM;
  const hr = session?.avg_hr ?? session?.avgHR ?? session?.biometrics?.avg_hr;
  const dateStr =
    session?.started_at ?? session?.startedAt ?? session?.date ?? session?.created_at;
  const timestamp = dateStr ? new Date(dateStr).getTime() : undefined;
  const sessionId = session?.id ?? session?.session_id;

  return {
    lactateMM: typeof avg === "number" ? avg : undefined,
    peakLactateMM: typeof peak === "number" ? peak : undefined,
    avgHR: typeof hr === "number" ? hr : undefined,
    timestamp: timestamp && !Number.isNaN(timestamp) ? timestamp : undefined,
    sessionId: typeof sessionId === "string" ? sessionId : undefined,
  };
}

// ─── Test API key ───

export const testAthyxKey = action({
  args: { apiKey: v.string() },
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(`${ATHYX_API_BASE}/sessions?limit=1`, {
        headers: { Authorization: `Bearer ${args.apiKey}` },
      });

      if (res.status === 401) {
        return {
          success: false,
          message: "❌ Athyx: неверный или отозванный API-ключ",
          hints: ["Проверь ключ на athyx.com/developers — он должен начинаться с ath_live_"],
        };
      }
      if (!res.ok) {
        return {
          success: false,
          message: `❌ Athyx: сервер ответил ${res.status}`,
          hints: [],
        };
      }

      const data = await res.json();
      const sessions = Array.isArray(data) ? data : data?.sessions ?? [];
      const latest = sessions[0] ? extractLactate(sessions[0]) : undefined;

      return {
        success: true,
        message: sessions.length
          ? `✅ Athyx подключён — последняя сессия: ${latest?.lactateMM ?? "?"} ммоль/л`
          : "✅ Athyx подключён — сессий пока нет",
        hints: [],
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        success: false,
        message: `❌ Athyx: ${msg.slice(0, 200)}`,
        hints: ["Проверь интернет-соединение и правильность ключа"],
      };
    }
  },
});

// ─── Sync one user's latest lactate reading ───

export const syncAthyx = internalAction({
  args: { userId: v.id("users") },
  handler: async (
    ctx,
    args,
  ): Promise<{ success: boolean; error?: string; syncedAt: number; details?: string[] }> => {
    const { userId } = args;
    const now = Date.now();

    const device = await ctx.runQuery(internal.sync.helpers.getAthyxDevice, { userId });
    if (!device?.tokenData) {
      return { success: false, error: "Athyx не настроен. Добавь API-ключ на странице Устройства.", syncedAt: now };
    }

    try {
      const res = await fetch(`${ATHYX_API_BASE}/sessions?limit=1`, {
        headers: { Authorization: `Bearer ${device.tokenData}` },
      });

      if (res.status === 401) {
        await ctx.runMutation(internal.sync.helpers.markDeviceStatus, {
          userId, type: "athyx", status: "unavailable",
        });
        return { success: false, error: "Athyx: ключ недействителен", syncedAt: now };
      }
      if (!res.ok) {
        return { success: false, error: `Athyx: HTTP ${res.status}`, syncedAt: now };
      }

      const data = await res.json();
      const sessions = Array.isArray(data) ? data : data?.sessions ?? [];
      if (!sessions.length) {
        return { success: true, error: undefined, syncedAt: now, details: ["Сессий пока нет"] };
      }

      const parsed = extractLactate(sessions[0]);
      if (parsed.lactateMM === undefined) {
        return { success: false, error: "Athyx: не удалось разобрать значение лактата из ответа API", syncedAt: now };
      }

      await ctx.runMutation(internal.sync.helpers.insertLactateReading, {
        userId,
        timestamp: parsed.timestamp ?? now,
        lactateMM: parsed.lactateMM,
        peakLactateMM: parsed.peakLactateMM,
        avgHR: parsed.avgHR,
        athyxSessionId: parsed.sessionId,
      });

      await ctx.runMutation(internal.sync.helpers.updateDeviceToken, {
        userId, type: "athyx", tokenData: device.tokenData, lastSync: now,
      });

      return {
        success: true,
        syncedAt: now,
        details: [`🩸 Лактат: ${parsed.lactateMM} ммоль/л`],
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, error: `Athyx: ${msg.slice(0, 200)}`, syncedAt: now };
    }
  },
});

// ─── Cron entry point: sync all users with a connected Athyx device ───

export const syncAllAthyx = internalAction({
  args: {},
  handler: async (ctx) => {
    const devices = await ctx.runQuery(internal.sync.helpers.getAllConnectedAthyxDevices, {});
    for (const device of devices) {
      await ctx.runAction(internal.sync.athyx.syncAthyx, { userId: device.userId });
    }
  },
});
