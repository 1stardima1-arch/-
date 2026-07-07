import { useState, useRef, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle,
  Send,
  Loader2,
  Sparkles,
  User,
  Bot,
  Heart,
  Activity,
  AlertTriangle,
} from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Coach() {
  const profile = useQuery(api.athletes.getProfile);
  const sendMessage = useAction(api.aiCoach.sendMessage);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: profile
        ? `Привет! Я твой AI-тренер. Вижу, ты ${{"beginner":"новичок","amateur":"любитель","semipro":"полупрофессионал","pro":"профессионал"}[profile.level]}, занимаешься ${profile.sports?.map((s: string) => ({"running":"бегом","cycling":"велоспортом","swimming":"плаванием","skiing":"лыжами","triathlon":"триатлоном","other":"спортом"})[s]).join(", ")}. Чем могу помочь сегодня?`
        : "Привет! Я твой AI-тренер. Расскажи о своих целях, тренировках или задай любой вопрос о спорте.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const result = await sendMessage({
        message: input,
        history,
      });
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: result.reply,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Извини, произошла ошибка. Попробуй ещё раз.",
        },
      ]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    { icon: Activity, text: "Проанализируй мою текущую форму" },
    { icon: Heart, text: "Как улучшить восстановление?" },
    { icon: AlertTriangle, text: "Болит колено при беге, что делать?" },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shadow-[0_0_16px_var(--accent-glow)]">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Тренер</h1>
          <p className="text-muted-foreground text-sm">Персональные рекомендации на основе твоих данных</p>
        </div>
      </div>

      {/* Context badge */}
      {profile && (
        <div className="glass-subtle rounded-lg p-3 text-xs flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3 text-primary" />
            {profile.sports?.map((s: string) => ({"running":"Бег","cycling":"Вело","swimming":"Плавание","skiing":"Лыжи","triathlon":"Триатлон","other":"Спорт"})[s]).join(", ")}
          </span>
          <span>Уровень: {{"beginner":"Новичок","amateur":"Любитель","semipro":"Полупро","pro":"Про"}[profile.level]}</span>
          {profile.injuries?.length > 0 && (
            <span className="flex items-center gap-1 text-chart-5">
              <AlertTriangle className="h-3 w-3" />
              {profile.injuries.length} травм в профиле
            </span>
          )}
        </div>
      )}

      {/* Chat card */}
      <Card className="glass border-0 flex flex-col h-[calc(100vh-250px)] min-h-[400px]">
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="p-4 space-y-4">
              <AnimatePresence>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={`rounded-xl px-4 py-2.5 text-sm max-w-[80%] leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "glass-subtle"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="glass-subtle rounded-xl px-4 py-3 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>

          {/* Suggestions (when empty) */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2">
              <p className="text-xs text-muted-foreground mb-2">О чём спросить:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => {
                      setInput(s.text);
                      setTimeout(() => handleSend(), 100);
                    }}
                    className="glass-subtle rounded-lg px-3 py-1.5 text-xs hover:glass transition-all flex items-center gap-1.5"
                  >
                    <s.icon className="h-3 w-3 text-primary" />
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Задай вопрос тренеру..."
                className="flex-1"
                disabled={loading}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="shrink-0"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              AI-тренер видит твой профиль и последние 30 дней тренировок. Не даёт медицинских советов.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
