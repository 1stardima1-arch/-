import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  Dumbbell,
  Calculator,
  Apple,
  CalendarDays,
  MessageCircle,
  Watch,
  ChevronDown,
  Activity,
  Heart,
  TrendingUp,
  Zap,
} from "lucide-react";

const stats = [
  { icon: Activity, label: "Тренировок отслежено", value: "10K+" },
  { icon: Heart, label: "HRV измерений", value: "1M+" },
  { icon: TrendingUp, label: "Спортсменов", value: "2K+" },
  { icon: Zap, label: "Улучшение результатов", value: "94%" },
];

const features = [
  {
    icon: Watch,
    title: "Синхронизация устройств",
    desc: "Garmin, Polar, Health Connect — все данные в одном месте. Никакого ручного ввода.",
  },
  {
    icon: MessageCircle,
    title: "AI Тренер 24/7",
    desc: "Персональные рекомендации на основе твоих реальных данных, а не общих шаблонов.",
  },
  {
    icon: Calculator,
    title: "Спортивные калькуляторы",
    desc: "Прогноз времени, VDOT, пульсовые зоны, план гидратации — с автозаполнением из профиля.",
  },
  {
    icon: Apple,
    title: "Умное питание",
    desc: "Дневные нормы, адаптирующиеся к нагрузке. План питания перед стартом.",
  },
  {
    icon: CalendarDays,
    title: "Планирование событий",
    desc: "Целевые старты, обратный отсчёт, тейпер-план под текущую форму.",
  },
  {
    icon: Dumbbell,
    title: "Анализ тренировок",
    desc: "PMC-график, пульсовые зоны, TSS — профессиональная аналитика без лишней сложности.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
} as const;

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-glow-radial opacity-40" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[400px] bg-glow-bottom opacity-30" />
        <div className="bg-grid absolute inset-0" />
      </div>

      {/* Nav */}
      <nav className="relative z-20 glass-subtle border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shadow-[0_0_16px_var(--accent-glow)]">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              AI Coach
            </span>
          </div>
          <div className="flex items-center gap-3">
            {!isLoading && (
              isAuthenticated ? (
                <Button onClick={() => navigate("/dashboard")} size="sm">
                  Дашборд
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                    Войти
                  </Button>
                  <Button size="sm" onClick={() => navigate("/auth")}>
                    Начать
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-24 pb-16 lg:pt-36 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 glass-subtle px-4 py-1.5 rounded-full mb-8 text-sm text-muted-foreground"
            >
              <Zap className="h-3.5 w-3.5 text-primary" />
              Персональный AI-тренер на твоих данных
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] max-w-4xl mx-auto">
              <span className="text-foreground">Твой </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-chart-2">
                персональный
              </span>
              <br />
              <span className="text-foreground">AI-тренер</span>
            </h1>

            <p className="mt-6 text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Объединяет данные с твоих устройств, спортивные калькуляторы, питание и план стартов
              в единую систему. Все инструменты работают на <span className="text-foreground font-medium">реальных данных</span>,
              а не требуют ручного ввода.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="glass-highlight relative overflow-hidden group text-base px-8 h-12"
                onClick={() => navigate("/auth")}
              >
                <span className="relative z-10">Начать бесплатно</span>
                <ArrowRight className="ml-2 h-5 w-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => {
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-muted-foreground"
              >
                Узнать больше
                <ChevronDown className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="glass-subtle rounded-xl p-5 text-center"
              >
                <s.icon className="h-5 w-5 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Всё, что нужно спортсмену
            </h2>
            <p className="mt-3 text-muted-foreground text-lg max-w-xl mx-auto">
              От синхронизации устройств до плана питания перед стартом — в одной платформе
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="glass group p-6 rounded-xl hover:glass-elevated transition-all duration-300 cursor-default"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:shadow-[0_0_20px_var(--accent-glow)] transition-shadow">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-highlight rounded-2xl p-10 lg:p-14 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-chart-2/5" />
            <div className="relative z-10">
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">
                Готов тренироваться умнее?
              </h2>
              <p className="mt-3 text-muted-foreground text-lg max-w-lg mx-auto">
                Подключи своё устройство, заполни профиль — и получи персональные рекомендации AI-тренера уже сегодня.
              </p>
              <Button
                size="lg"
                className="mt-8 glass-highlight text-base px-8 h-12"
                onClick={() => navigate("/auth")}
              >
                Создать профиль
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>AI Coach — Universal AI Trainer. Тренируйся с умом.</p>
        </div>
      </footer>
    </div>
  );
}
