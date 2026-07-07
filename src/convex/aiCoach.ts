"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

type Message = {
  role: "user" | "assistant";
  content: string;
};

/**
 * Build a comprehensive system prompt with full athlete context.
 * This is what makes the coach truly personalized.
 */
function buildSystemPrompt(profile: Record<string, unknown> | null): string {
  const sportLabels: Record<string, string> = {
    running: "бег",
    cycling: "велоспорт",
    swimming: "плавание",
    skiing: "лыжный спорт",
    triathlon: "триатлон",
    other: "другие виды спорта",
  };

  const levelLabels: Record<string, string> = {
    beginner: "новичок",
    amateur: "любитель",
    semipro: "полупрофессионал",
    pro: "профессионал",
  };

  const genderLabels: Record<string, string> = {
    male: "мужской",
    female: "женский",
    other: "другой",
  };

  let contextParts: string[] = [];

  if (profile) {
    const sports =
      (profile.sports as string[])?.map((s) => sportLabels[s] || s) || [];
    const level = levelLabels[profile.level as string] || profile.level;
    const gender = genderLabels[profile.gender as string] || profile.gender;

    contextParts.push(`Пол: ${gender}`);
    contextParts.push(`Возраст: ${profile.age} лет`);
    contextParts.push(`Рост: ${profile.height} см, Вес: ${profile.weight} кг`);
    contextParts.push(`Вид(ы) спорта: ${sports.join(", ")}`);
    contextParts.push(`Уровень: ${level}`);
    contextParts.push(`Стаж: ${profile.experienceYears} лет`);
    if (profile.maxHR) contextParts.push(`Максимальный пульс: ${profile.maxHR} уд/мин`);
    if (profile.restingHR) contextParts.push(`Пульс покоя: ${profile.restingHR} уд/мин`);
    if (profile.ftp) contextParts.push(`FTP: ${profile.ftp} Вт (велоспорт)`);
    if (profile.thresholdPace) contextParts.push(`Пороговый темп: ${profile.thresholdPace} мин/км`);
    if (profile.weeklyVolumeHours) contextParts.push(`Недельный объём тренировок: ${profile.weeklyVolumeHours} часов`);

    // Target event
    const targetEvent = profile.targetEvent as Record<string, string> | undefined;
    if (targetEvent?.name) {
      let eventStr = `Целевое событие: ${targetEvent.name}, дата: ${targetEvent.date}, дисциплина: ${targetEvent.discipline}`;
      if (targetEvent.targetTime) eventStr += `, целевое время: ${targetEvent.targetTime}`;
      contextParts.push(eventStr);
    }

    // Injuries
    const injuries = profile.injuries as Array<Record<string, string>> | undefined;
    if (injuries && injuries.length > 0) {
      const injuryStr = injuries
        .map((i) => `${i.zone} — ${i.type} (ограничение: ${i.limitation})`)
        .join("; ");
      contextParts.push(`Травмы/ограничения (ВАЖНО!): ${injuryStr}`);
    }

    if (profile.chronicConditions) {
      contextParts.push(`Хронические состояния: ${profile.chronicConditions}`);
    }
  }

  const contextBlock = contextParts.length > 0
    ? contextParts.join("\n")
    : "Данных о спортсмене пока нет. Предложи заполнить профиль для персонализированных советов.";

  return `ТЫ — ПЕРСОНАЛЬНЫЙ AI-ТРЕНЕР И СПОРТИВНЫЙ ПСИХОЛОГ

## Твоя личность
Ты сочетаешь знания профессионального тренера по выносливости (бег, велоспорт, плавание, лыжи, триатлон) и спортивного психолога. Ты не просто даёшь цифры — ты понимаешь психологию спортсмена, мотивацию, страхи, перетренированность и эмоциональное выгорание.

## Данные спортсмена (обязательно учитывай!)
${contextBlock}

## Твои принципы
1. **Эмпатия и поддержка**: Спортсмены часто сомневаются в себе, боятся травм или перетренированности. Поддерживай, мотивируй, но не льсти. Будь честным.
2. **Научная база**: Используй принципы спортивной физиологии, биомеханики, нутрициологии. Ссылайся на научные концепции, но объясняй простым языком.
3. **Учёт вида спорта**: Принципы тренировки бега ≠ плавания ≠ велоспорта ≠ лыж. Адаптируй советы под конкретный вид спорта спортсмена.
4. **Безопасность**: Всегда учитывай травмы/ограничения. Если спортсмен жалуется на боль — не говори "терпи", а рекомендуй обратиться к врачу/физиотерапевту.
5. **Психология**: 
   - Помогай с мотивацией (как не бросить тренировки)
   - Работай с предстартовым волнением
   - Помогай восстанавливаться после неудачных стартов
   - Поддерживай в периоды спада формы
   - Учи управлять стрессом через дыхание и визуализацию
6. **Персонализация**: Всегда ссылайся на конкретные данные пользователя. Не давай общих советов, которые подходят всем.

## О чём тебя можно спросить
- ⚡ План тренировки и периодизация
- ❤️ Восстановление, пульсовые зоны, HRV
- 🏃 Техника бега, плавания, езды
- 🥗 Питание и гидратация вокруг тренировок
- 🧘 Психология: мотивация, стресс, выгорание
- 🏆 Подготовка к старту, стратегия гонки
- 🩹 Профилактика травм
- 📊 Анализ данных (PACER, TSS, CTL/ATL/TSB)

## Формат ответа
- Отвечай на языке пользователя (русский/английский)
- Будь структурированным: используй короткие абзацы, списки где уместно
- Не будь сухим — добавляй эмоциональный интеллект
- Задавай уточняющие вопросы, если не хватает данных
- Никогда не давай медицинских диагнозов — рекомендовать врача при болях`;
}

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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // 1. Gather athlete context
    const profile = await ctx.runQuery(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (await import("./athletes")).getProfile as any,
      {}
    );

    const systemPrompt = buildSystemPrompt(profile ?? null);

    // 2. Try DeepSeek first (primary)
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    if (deepseekApiKey) {
      try {
        const response = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${deepseekApiKey}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: systemPrompt },
              ...args.history,
              { role: "user", content: args.message },
            ],
            temperature: 0.7,
            max_tokens: 2048,
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            choices: Array<{ message: { content: string } }>;
          };
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            return { reply };
          }
        }

        // DeepSeek returned an error — log and fall through
        console.warn(
          "DeepSeek API error:",
          response.status,
          await response.text().catch(() => "no body")
        );
      } catch (e) {
        console.warn("DeepSeek request failed:", e);
        // Fall through to vly
      }
    }

    // 3. Fallback to VLY AI integration
    try {
      const { vly } = await import("../lib/vly-integrations");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await (vly as any).com?.completion({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...args.history,
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
              : (result.data as { content?: string }).content ??
                JSON.stringify(result.data),
        };
      }
    } catch (e) {
      console.error("AI Coach fallback error:", e);
    }

    // 4. Ultimate fallback
    return {
      reply:
        "Извини, сейчас не могу ответить — сервис AI временно недоступен. " +
        "Попробуй позже или проверь, что API-ключ DeepSeek настроен (DEEPSEEK_API_KEY). " +
        "Если хочешь, я могу рассказать о настройке!",
    };
  },
});
