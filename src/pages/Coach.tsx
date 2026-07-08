import { useState, useRef, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send, Loader2, Sparkles, User, Bot, Heart,
  Activity, AlertTriangle, Brain, Dumbbell, Moon,
  Apple, Zap, ChevronDown, ChevronUp
} from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

export default function Coach() {
  const profile = useQuery(api.athletes.getProfile);
  const sendMessage = useAction(api.aiCoach.sendMessage);
  const todayMetrics = useQuery(api.metrics.getToday);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => {
    const sports = profile?.sports?.map((s: string) =>
      ({ running: "бегом", cycling: "велоспортом", swimming: "плаванием", skiing: "лыжами", triathlon: "триатлоном", other: "спортом" })[s]
    ).join(", ");
    const level = ({ beginner: "новичок", amateur: "любитель", semipro: "полупрофессионал", pro: "профессионал" })[profile?.level ?? "amateur"];

    return [{
      role: "assistant",
      content: profile
        ? `👋 Привет! Я твой персональный AI-тренер.\n\nВижу, ты **${level}**, занимаешься ${sports}. ${
          profile.targetEvent
            ? `\n\n🎯 Твоя цель: **${(profile.targetEvent as Record<string,string>).name}** — ${(profile.targetEvent as Record<string,string>).date}`
            : ""
        }\n\nЯ анализирую твои тренировки, сон, HRV и восстановление. Спроси меня о чём угодно — план тренировок, техника, питание, психология стартов, восстановление.\n\nПросто напиши свой вопрос! 👇`
        : "Привет! Я твой AI-тренер на базе DeepSeek. Расскажи о своих целях, тренировках или задай любой вопрос о спорте.",
    }];
  });
  const [loading, setLoading] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const userMsg: Message = { role: "user", content: msg };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const result = await sendMessage({ message: msg, history });
      setMessages((m) => [...m, { role: "assistant", content: result.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Извини, произошла ошибка. Попробуй ещё раз." }]);
    }
    setLoading(false);
  };

  const suggestions = [
    { icon: Activity, text: "Проанализируй мою текущую форму", prompt: "Проанализируй мою текущую тренировочную форму на основе последних данных. Дай рекомендации по нагрузке на эту неделю." },
    { icon: Heart, text: "Как улучшить восстановление?", prompt: "Как мне улучшить восстановление? Учитывай мой уровень, вид спорта и возраст. Дай конкретные практические советы." },
    { icon: Brain, text: "Составь план на неделю", prompt: "Составь тренировочный план на эту неделю с учётом моего уровня, вида спорта и целевого события." },
    { icon: Dumbbell, text: "Силовые для выносливости", prompt: "Какие силовые упражнения лучше всего подходят для моего вида спорта? Дай конкретную программу." },
    { icon: Apple, text: "Питание до и после", prompt: "Что и когда мне есть до, во время и после тренировки? Рассчитай под мой вес и вид спорта." },
    { icon: Moon, text: "Как лучше спать?", prompt: "Как улучшить качество сна для лучшего восстановления? У меня бывают проблемы с засыпанием после вечерних тренировок." },
  ];

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white/90">AI Тренер</h1>
          <p className="text-sm text-white/30">DeepSeek · Спортивная наука + психология</p>
        </div>
      </div>

      {/* Context panel (collapsible) */}
      {profile && (
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.01] overflow-hidden">
          <button onClick={() => setShowContext(!showContext)} className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-white/30 hover:text-white/50 transition-colors">
            <span className="flex items-center gap-2">
              <Activity className="h-3 w-3" />
              {showContext ? "Скрыть контекст" : "Что AI-тренер знает обо мне"}
            </span>
            {showContext ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <AnimatePresence>
            {showContext && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-white/25">
                  <span>🔹 {({ male: "Мужчина", female: "Женщина", other: "Другое" })[profile.gender]}</span>
                  <span>🔹 {profile.age} лет</span>
                  <span>🔹 {profile.weight} кг</span>
                  <span>🔹 {({ beginner: "Новичок", amateur: "Любитель", semipro: "Полупро", pro: "Про" })[profile.level]}</span>
                  <span>🔹 Стаж {profile.experienceYears} г.</span>
                  {profile.maxHR ? <span>🔹 MaxHR {profile.maxHR}</span> : null}
                  {profile.restingHR ? <span>🔹 RHR {profile.restingHR}</span> : null}
                  {profile.ftp ? <span>🔹 FTP {profile.ftp}W</span> : null}
                  {todayMetrics?.hrv ? <span>🔹 HRV {todayMetrics.hrv}</span> : null}
                  {todayMetrics?.sleepDuration ? <span>🔹 Сон {todayMetrics.sleepDuration.toFixed(1)}ч</span> : null}
                  {(profile.injuries as Array<Record<string,string>>)?.length > 0 && (
                    <span className="text-amber-400">⚠️ {(profile.injuries as Array<Record<string,string>>).length} травм</span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Chat card */}
      <Card className="border-0 bg-white/[0.01] flex flex-col h-[calc(100vh-260px)] min-h-[400px]">
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-violet-400" />
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-3 text-sm max-w-[82%] leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-violet-500 to-indigo-500 text-white"
                      : "bg-white/[0.03] border border-white/[0.04] text-white/70"
                  }`}>
                    {msg.content}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-full bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-3.5 w-3.5 text-white/20" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading */}
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <div className="bg-white/[0.03] border border-white/[0.04] rounded-2xl px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </motion.div>
            )}
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="px-4 pb-3">
              <p className="text-xs text-white/20 mb-2.5">О чём спросить:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => handleSend(s.prompt)}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.02] text-left transition-all text-xs text-white/35 hover:text-white/60"
                  >
                    <s.icon className="h-3.5 w-3.5 shrink-0 text-violet-400/50" />
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-white/[0.04]">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Задай вопрос тренеру..."
                className="flex-1 rounded-xl bg-white/[0.03] border-white/[0.06] text-white/80 placeholder:text-white/15 h-11 focus:border-violet-500/30 transition-colors"
                disabled={loading}
              />
              <Button
                size="icon"
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="shrink-0 h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 hover:from-violet-400 hover:to-indigo-400 shadow-lg shadow-violet-500/20 transition-all active:scale-95"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-white/15 mt-2 text-center">
              AI Coach by DeepSeek · Учитывает профиль и метрики · НЕ даёт медицинских диагнозов
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
