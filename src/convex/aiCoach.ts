"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { vly } from "../lib/vly-integrations";

export const sendMessage = action({
  args: {
    message: v.string(),
    history: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;

    // Gather user context
    const profile = await ctx.runQuery(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (await import("./athletes")).getProfile as any,
      {}
    );

    // Build system prompt with athlete context
    let contextStr = "";
    if (profile) {
      contextStr = `
Ты — персональный AI-тренер спортсмена. ВСЕГДА учитывай этот контекст:

ПРОФИЛЬ:
- Пол: ${profile.gender}
- Возраст: ${profile.age} лет
- Рост: ${profile.height} см, Вес: ${profile.weight} кг
- Виды спорта: ${profile.sports.join(", ")}
- Уровень: ${profile.level}
- Стаж: ${profile.experienceYears} лет
- Макс. пульс: ${profile.maxHR ?? "неизвестно"} уд/мин
- Пульс покоя: ${profile.restingHR ?? "неизвестно"} уд/мин
${profile.ftp ? `- FTP: ${profile.ftp} Вт` : ""}
${profile.thresholdPace ? `- Пороговый темп: ${profile.thresholdPace} мин/км` : ""}
${profile.injuries.length > 0 ? `- Травмы/ограничения: ${profile.injuries.map((i: { zone: string; type: string; limitation: string }) => `${i.zone} (${i.type}: ${i.limitation})`).join("; ")}` : ""}
${profile.chronicConditions ? `- Хронические состояния: ${profile.chronicConditions}` : ""}
${profile.targetEvent ? `- Целевое событие: ${profile.targetEvent.name}, ${profile.targetEvent.date}, ${profile.targetEvent.discipline}${profile.targetEvent.targetTime ? `, цель: ${profile.targetEvent.targetTime}` : ""}` : ""}
- Недельный объём: ${profile.weeklyVolumeHours} часов
`;
    } else {
      contextStr = `
Ты — персональный AI-тренер. У этого спортсмена ещё нет заполненного профиля. 
При ответах учитывай, что данных мало — не выдумывай тренды, а предложи заполнить профиль для персонализированных рекомендаций.
`;
    }

    const systemPrompt = `${contextStr}

ПРАВИЛА ОТВЕТА:
1. Отвечай с учётом вида(ов) спорта спортсмена. Тренировочные принципы бега ≠ плавания ≠ велоспорта.
2. Если данных мало — прямо говори об этом, не выдумывай тренды.
3. Явно предупреждай о рисках: низкий Recovery + тяжёлая тренировка → предложи облегчить.
4. Учитывай травмы/ограничения из профиля при ЛЮБЫХ рекомендациях по нагрузке.
5. Ссылайся на конкретные цифры пользователя, а не общие фразы.
6. Отвечай на том же языке, на котором задан вопрос.
7. Будь краток, но содержателен. Давай actionable рекомендации.`;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await (vly as any).com?.completion({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...args.history.map((h) => ({
            role: h.role as "user" | "assistant",
            content: h.content,
          })),
          { role: "user", content: args.message },
        ],
        temperature: 0.7,
        maxTokens: 800,
      });

      if (result?.success && result?.data) {
        return {
          reply:
            typeof result.data === "string"
              ? result.data
              : (result.data as { content?: string }).content ?? JSON.stringify(result.data),
        };
      }
      return {
        reply: "Извини, не могу сейчас ответить. Попробуй позже.",
      };
    } catch (e) {
      console.error("AI Coach error:", e);
      return {
        reply:
          "Произошла ошибка при обращении к AI. Пожалуйста, попробуй ещё раз.",
      };
    }
  },
});
