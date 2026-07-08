import { Link } from "react-router";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  Sparkles, BarChart3, Activity, Dumbbell, Heart, Apple,
  Brain, Zap, Gauge, ChevronRight, TrendingUp, Moon,
  Watch, MessageCircle, Shield, ArrowRight, Quote
} from "lucide-react";

const ease: readonly [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const features = [
  { icon: Watch, title: "Синхронизация Garmin & Polar", desc: "Автоматический импорт тренировок, сна, HRV и пульса покоя с твоих устройств", color: "from-emerald-400 to-teal-500", bg: "bg-emerald-500/10" },
  { icon: Brain, title: "AI Тренер (DeepSeek)", desc: "Персональный тренер, который понимает твою физиологию, травмы и цели. Спортивная психология и мотивация", color: "from-violet-400 to-purple-500", bg: "bg-violet-500/10" },
  { icon: BarChart3, title: "Продвинутая аналитика", desc: "PMC-график (CTL/ATL/TSB), HRV тренды, Recovery Score, Body Battery — как у профессионалов", color: "from-blue-400 to-cyan-500", bg: "bg-blue-500/10" },
  { icon: Apple, title: "Нутрициология", desc: "Трекинг калорий, БЖУ, водного баланса. AI-рекомендации по питанию для восстановления", color: "from-rose-400 to-pink-500", bg: "bg-rose-500/10" },
  { icon: Heart, title: "Wellness дневник", desc: "Сон, стресс, алкоголь, кофеин, экранное время — полная картина твоего восстановления", color: "from-amber-400 to-orange-500", bg: "bg-amber-500/10" },
  { icon: TrendingUp, title: "AI Прогноз формы", desc: "Предсказание пика формы, риска перетренированности и оптимальных дней для соревнований", color: "from-sky-400 to-indigo-500", bg: "bg-sky-500/10" },
];

const stats = [
  { value: "CTL/ATL", label: "PMC-график" },
  { value: "HRV", label: "Вариабельность" },
  { value: "TSS", label: "Нагрузка" },
  { value: "DeepSeek", label: "AI-тренер" },
];

const testimonials = [
  { text: "AI Coach заменил мне персонального тренера. Видит мои данные с Garmin, анализирует HRV и даёт рекомендации, которые реально работают.", name: "Александр М.", role: "Триатлет, Ironman 70.3" },
  { text: "Наконец-то приложение, которое объединяет все метрики: тренировки, сон, питание, стресс. И AI-тренер, который учитывает мои травмы.", name: "Елена К.", role: "Бегунья, марафон" },
];

export default function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#030308] selection:bg-violet-500/20 text-white overflow-x-hidden">
      {/* Ambient light effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/8 blur-[120px]" />
        <div className="absolute top-[30%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-500/6 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-2xl bg-[#030308]/60 border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-white/90">AI Coach</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm text-white/50 hover:text-white/80 transition-colors hidden sm:block">
              Войти
            </Link>
            <Link to="/auth" className="px-5 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-white/90 transition-all duration-200 active:scale-95 shadow-lg shadow-white/10">
              Начать бесплатно
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <motion.section style={{ opacity: heroOpacity, scale: heroScale }} className="relative pt-28 pb-20 px-6 z-10">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn delay={0}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 text-violet-300 text-sm mb-8 border border-violet-500/20 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              AI-powered спортивная аналитика
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.03] mb-6">
              <span className="block text-white/90">Твой AI</span>
              <span className="block bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
                спортивный тренер
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="text-lg text-white/40 max-w-lg mx-auto mb-10 leading-relaxed">
              Синхронизация с Garmin и Polar. Продвинутая аналитика как у профессионалов. 
              AI-тренер на базе DeepSeek, который знает твою физиологию.
            </p>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/auth" className="group px-8 py-4 bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-medium rounded-2xl shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 active:scale-95 inline-flex items-center gap-2">
                Начать тренироваться
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link to="/auth" className="px-8 py-4 bg-white/[0.03] hover:bg-white/[0.06] text-white/70 hover:text-white font-medium rounded-2xl border border-white/[0.08] transition-all duration-200 active:scale-95 backdrop-blur-sm">
                Узнать больше
              </Link>
            </div>
          </FadeIn>

          {/* Stats row */}
          <FadeIn delay={0.5}>
            <div className="mt-16 flex items-center justify-center gap-8 md:gap-12 flex-wrap">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-bold text-white/80 font-mono">{s.value}</div>
                  <div className="text-xs text-white/30 mt-1 font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </motion.section>

      {/* Features grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-32">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Всё, что нужно спортсмену</h2>
            <p className="text-white/40 max-w-md mx-auto">Единая платформа для тренировок, восстановления и аналитики</p>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.08}>
              <div className="group p-6 rounded-2xl border border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all duration-300 h-full">
                <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300`}>
                  <f.icon className={`w-5 h-5 bg-gradient-to-br ${f.color} bg-clip-text text-transparent`} style={{ filter: 'drop-shadow(0 0 8px currentColor)' }} />
                </div>
                <h3 className="font-semibold text-sm mb-2 text-white/85">{f.title}</h3>
                <p className="text-sm text-white/35 leading-relaxed">{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-32">
        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((t, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="p-8 rounded-2xl border border-white/[0.05] bg-white/[0.01] relative">
                <Quote className="absolute top-6 left-6 h-8 w-8 text-white/[0.04]" />
                <p className="text-white/60 leading-relaxed mb-6 relative z-10 text-sm">«{t.text}»</p>
                <div>
                  <p className="font-medium text-sm text-white/80">{t.name}</p>
                  <p className="text-xs text-white/30 mt-0.5">{t.role}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-32">
        <FadeIn>
          <div className="text-center p-12 md:p-16 rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.05] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-violet-500/3 to-transparent" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Готов тренироваться умнее?</h2>
              <p className="text-white/40 mb-8 max-w-md mx-auto">Подключи Garmin, получай персональный план от AI тренера и отслеживай прогресс как профи.</p>
              <Link to="/auth" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-medium rounded-2xl shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 active:scale-95">
                <Sparkles className="h-4 w-4" />
                Создать аккаунт бесплатно
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-white/25">
            <Sparkles className="h-3.5 w-3.5" />
            AI Coach — тренируйся умнее
          </div>
          <div className="flex items-center gap-6 text-xs text-white/20">
            <span>Конфиденциальность</span>
            <span>Условия</span>
            <span>Поддержка</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
