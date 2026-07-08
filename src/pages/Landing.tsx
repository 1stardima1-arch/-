import { Link } from "react-router";
import { motion } from "framer-motion";
import { Sparkles, BarChart3, Activity, Dumbbell, Heart, Apple } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;
const fadeIn = { hidden: { opacity: 0, y: 24 }, visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.6, ease } }) };

const features = [
  { icon: BarChart3, title: "Дашборд тренировок", desc: "Все метрики в одном окне — CTL/ATL/TSB, HRV, сон" },
  { icon: Activity, title: "Синхронизация устройств", desc: "Garmin, Polar — автоматический импорт тренировок" },
  { icon: Dumbbell, title: "AI Тренер", desc: "Персональный тренер на базе DeepSeek — тренировки и психология" },
  { icon: Heart, title: "Wellness дневник", desc: "Сон, стресс, питание, самочувствие — полная картина" },
  { icon: Apple, title: "Питание", desc: "Логируй еду и отслеживай калории, белки, жиры и углеводы" },
  { icon: Sparkles, title: "События и гонки", desc: "Планируй старты, отслеживай подготовку и результаты" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background selection:bg-purple-500/20 selection:text-purple-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/50 border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-purple-500/20">AI</div>
            <span className="font-semibold text-sm tracking-tight">AI Coach</span>
          </Link>
          <Link to="/auth" className="px-5 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-white/90 transition-all duration-200 active:scale-95">
            Начать
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(120,80,255,0.12),transparent_70%)]" />
        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div
            initial="hidden"
            animate="visible"
            custom={0}
            variants={fadeIn}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 text-purple-300 text-sm mb-8 border border-purple-500/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI-powered спортивный тренер
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            custom={1}
            variants={fadeIn}
            className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6"
          >
            <span className="bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">
              Тренируйся
            </span>{" "}
            <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              умнее
            </span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            custom={2}
            variants={fadeIn}
            className="text-lg text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed"
          >
            Персональный AI тренер, синхронизация с Garmin и Polar, продвинутая аналитика и спортивная психология — всё в одном приложении.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            custom={3}
            variants={fadeIn}
            className="flex items-center justify-center gap-4"
          >
            <Link to="/auth" className="px-8 py-3.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 active:scale-95">
              Попробовать
            </Link>
            <Link to="/auth" className="px-8 py-3.5 bg-white/[0.04] hover:bg-white/[0.06] text-foreground font-medium rounded-xl border border-white/[0.08] transition-all duration-200 active:scale-95">
              Войти
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-32">
        <div className="grid md:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              variants={fadeIn}
              className="group p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/15 transition-colors">
                <f.icon className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-semibold text-sm mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Footer CTA */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          custom={6}
          className="mt-20 text-center p-12 rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.05]"
        >
          <h2 className="text-2xl font-bold mb-3">Готов начать?</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Подключи Garmin, получай персональные тренировки от AI тренера уже сегодня.</p>
          <Link to="/auth" className="inline-flex px-7 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/35 transition-all duration-300 active:scale-95">
            Создать аккаунт
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
