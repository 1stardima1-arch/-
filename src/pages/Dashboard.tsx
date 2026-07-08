import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Heart, Moon, Battery, TrendingUp, Timer, Activity,
  ArrowRight, MessageCircle, Zap, Gauge, Footprints,
  Flame, Watch, Dumbbell, Award
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart
} from "recharts";

const ease: readonly [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

function MetricCard({
  title, value, unit, icon: Icon, sub, color = "text-white", progress,
  trend,
}: {
  title: string; value: number | string; unit?: string;
  icon: React.ElementType; sub?: string; color?: string;
  progress?: number; trend?: { value: number; label: string };
}) {
  return (
    <Card className="border-0 bg-white/[0.02] backdrop-blur-sm overflow-hidden group hover:bg-white/[0.04] transition-colors duration-300">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-[11px] text-white/30 font-medium uppercase tracking-wider">{title}</p>
          <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center group-hover:bg-white/[0.06] transition-colors">
            <Icon className="h-4 w-4 text-white/30 group-hover:text-white/50 transition-colors" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[28px] font-bold text-white/90 leading-none">{value}</span>
          {unit && <span className="text-sm text-white/30">{unit}</span>}
        </div>
        {sub && <p className="text-xs text-white/25 mt-1.5">{sub}</p>}
        {trend && (
          <p className={`text-xs mt-1.5 ${trend.value >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {trend.value >= 0 ? "↑" : "↓"} {trend.label}
          </p>
        )}
        {progress !== undefined && <Progress value={progress} className="mt-3 h-1 bg-white/[0.04]" />}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const profile = useQuery(api.athletes.getProfile);
  const isOnboarded = useQuery(api.athletes.isOnboarded);
  const todayMetrics = useQuery(api.metrics.getToday);
  const recentMetrics = useQuery(api.metrics.getRange, { days: 30 });
  const performance = useQuery(api.performance.getRange, { days: 90 });
  const upcomingEvents = useQuery(api.events.getUpcoming);
  const recentActivities = useQuery(api.activities.list, { limit: 5 });

  useEffect(() => {
    if (isOnboarded === false) navigate("/onboarding");
  }, [isOnboarded, navigate]);

  if (!isOnboarded) return null;

  const hrvData = (recentMetrics ?? [])
    .filter((m) => m.hrv)
    .map((m) => ({ date: m.date.slice(5), hrv: m.hrv }));

  const avgHRV = hrvData.length > 0
    ? hrvData.reduce((s, d) => s + (d.hrv ?? 0), 0) / hrvData.length : 0;

  const pmcData = (performance ?? []).map((p) => ({
    date: p.date.slice(5),
    ctl: Math.round(p.ctl), atl: Math.round(p.atl), tsb: Math.round(p.tsb),
  }));

  const nearestEvent = upcomingEvents?.[0];
  const sleepHours = todayMetrics?.sleepDuration ? todayMetrics.sleepDuration.toFixed(1) : null;
  const sleepEff = todayMetrics?.sleepEfficiency;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/90">
            {profile?.sports
              ?.map((s) => ({ running: "Бегун", cycling: "Велогонщик", swimming: "Пловец", skiing: "Лыжник", triathlon: "Триатлет", other: "Спортсмен" })[s])
              .join(" / ") || "Спортсмен"}
          </h1>
          <p className="text-sm text-white/30 mt-0.5">
            {{ beginner: "Новичок", amateur: "Любитель", semipro: "Полупрофессионал", pro: "Профессионал" }[profile?.level ?? "amateur"]}
            {profile?.age ? ` · ${profile.age} лет` : ""}
          </p>
        </div>
        <Button onClick={() => navigate("/coach")} className="rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 border-0 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all">
          <MessageCircle className="mr-2 h-4 w-4" /> AI Тренер
        </Button>
      </motion.div>

      {/* Empty state */}
      {!todayMetrics && (recentActivities?.length ?? 0) === 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/[0.05] bg-white/[0.01] p-10 text-center">
          <Watch className="h-12 w-12 text-white/[0.08] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white/70">Нет данных для отображения</h3>
          <p className="text-sm text-white/25 mt-1 max-w-md mx-auto">Подключи Garmin или Polar — и все метрики появятся здесь автоматически</p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button variant="outline" onClick={() => navigate("/devices")} className="rounded-xl border-white/[0.08]">Подключить устройство</Button>
            <Button onClick={() => navigate("/training")} className="rounded-xl">Добавить тренировку</Button>
          </div>
        </motion.div>
      )}

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          title="Recovery"
          value={todayMetrics?.recoveryScore ?? "--"}
          unit={todayMetrics?.recoveryScore ? "/100" : undefined}
          icon={Heart}
          color={todayMetrics?.recoveryScore && todayMetrics.recoveryScore >= 70 ? "text-emerald-400" : "text-amber-400"}
          sub={todayMetrics?.recoveryScore ? (todayMetrics.recoveryScore >= 70 ? "Готов тренироваться" : todayMetrics.recoveryScore >= 40 ? "Лёгкая нагрузка" : "Нужен отдых") : undefined}
          progress={todayMetrics?.recoveryScore ?? 0}
        />
        <MetricCard
          title="Пульс покоя"
          value={todayMetrics?.restingHR ?? "--"}
          unit={todayMetrics?.restingHR ? "уд/мин" : undefined}
          icon={Activity}
          sub={todayMetrics?.restingHR ? `${todayMetrics.restingHR < 60 ? "Отлично" : todayMetrics.restingHR < 70 ? "Норма" : "Повышен"}` : undefined}
        />
        <MetricCard
          title="Сон"
          value={sleepHours ?? "--"}
          unit={sleepHours ? "ч" : undefined}
          icon={Moon}
          sub={sleepEff ? `Эффективность ${sleepEff}%` : undefined}
          trend={sleepEff ? { value: sleepEff >= 85 ? 1 : -1, label: sleepEff >= 85 ? "Хороший сон" : "Недостаточный" } : undefined}
        />
        <MetricCard
          title="HRV"
          value={todayMetrics?.hrv ?? "--"}
          unit={todayMetrics?.hrv ? "мс" : undefined}
          icon={Gauge}
          sub={todayMetrics?.hrv ? (todayMetrics.hrv >= avgHRV ? "Выше среднего" : "Ниже среднего") : undefined}
        />
      </div>

      {/* PMC Chart */}
      {pmcData.length > 3 && (
        <Card className="border-0 bg-white/[0.02]">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-white/60">
              <TrendingUp className="h-4 w-4" /> PMC-график (CTL / ATL / TSB) — 90 дней
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={pmcData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} interval="preserveStartEnd" />
                <YAxis stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#12121a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", fontSize: "12px", color: "#fff" }} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                <Line type="monotone" dataKey="ctl" stroke="#818cf8" strokeWidth={2} dot={false} name="CTL (фитнес)" />
                <Line type="monotone" dataKey="atl" stroke="#34d399" strokeWidth={2} dot={false} name="ATL (усталость)" />
                <Line type="monotone" dataKey="tsb" stroke="#fbbf24" strokeWidth={2} dot={false} name="TSB (форма)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* HRV + Training Status row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {hrvData.length > 3 && (
          <Card className="border-0 bg-white/[0.02]">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-white/60">
                <Gauge className="h-4 w-4" /> HRV тренд — 30 дней
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={hrvData}>
                  <defs>
                    <linearGradient id="hrvGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} interval="preserveStartEnd" />
                  <YAxis stroke="rgba(255,255,255,0.15)" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#12121a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", fontSize: "12px", color: "#fff" }} />
                  <ReferenceLine y={avgHRV} stroke="rgba(129,140,248,0.4)" strokeDasharray="6 3" />
                  <Area type="monotone" dataKey="hrv" stroke="#818cf8" strokeWidth={2} fill="url(#hrvGradient)" dot={false} name="HRV" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {todayMetrics?.trainingStatus && (
          <Card className="border-0 bg-white/[0.02]">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-white/60">
                <Zap className="h-4 w-4" /> Тренировочный статус
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-white/[0.02] text-center">
                  <p className="text-lg font-semibold">{todayMetrics.trainingStatus}</p>
                  {todayMetrics.bodyBattery && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-white/30 mb-1">
                        <span>Body Battery</span>
                        <span>{todayMetrics.bodyBattery}/100</span>
                      </div>
                      <Progress value={todayMetrics.bodyBattery} className="h-1.5 bg-white/[0.04]" />
                    </div>
                  )}
                  {todayMetrics.stressLevel && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-white/30 mb-1">
                        <span>Стресс</span>
                        <span>{todayMetrics.stressLevel}/100</span>
                      </div>
                      <Progress value={todayMetrics.stressLevel} className="h-1.5 bg-white/[0.04]" />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent activities */}
      <Card className="border-0 bg-white/[0.02]">
        <CardHeader className="pb-0 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-white/60">
            <Timer className="h-4 w-4" /> Последние тренировки
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/training")} className="text-white/30 hover:text-white/60">
            Все <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          {(recentActivities ?? []).length > 0 ? (
            <div className="space-y-1.5">
              {(recentActivities ?? []).slice(0, 5).map((a) => (
                <div key={a._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${a.planned ? "bg-white/[0.03]" : "bg-violet-500/10"}`}>
                      {a.sport === "running" ? <Footprints className="h-4 w-4 text-violet-400" /> :
                       a.sport === "cycling" ? <Dumbbell className="h-4 w-4 text-emerald-400" /> :
                       <Timer className="h-4 w-4 text-blue-400" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/80">
                        {a.title || ({ running: "Бег", cycling: "Вело", swimming: "Плавание", skiing: "Лыжи", triathlon: "Триатлон", other: "Тренировка" }[a.sport] || "Тренировка")}
                      </p>
                      <p className="text-xs text-white/25">
                        {a.date?.slice(5)}
                        {a.distance ? ` · ${a.distance.toFixed(1)} км` : ""}
                        {a.duration ? ` · ${Math.round(a.duration / 60)} мин` : ""}
                        {a.tss ? ` · TSS ${a.tss}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${a.planned ? "bg-white/[0.03] text-white/25" : "bg-emerald-500/10 text-emerald-400"}`}>
                    {a.planned ? "План" : "Вып."}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/20 text-center py-8">
              Нет тренировок.{" "}
              <button onClick={() => navigate("/training")} className="text-violet-400 hover:underline">Добавить первую</button>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Nearest event */}
      {nearestEvent && (
        <Card className="border-0 bg-gradient-to-r from-violet-500/5 to-indigo-500/5 border-l-2 border-l-violet-400">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-white/30 uppercase tracking-wider">Ближайший старт</p>
              <p className="font-semibold text-white/80 mt-0.5">{nearestEvent.name}</p>
              <p className="text-sm text-white/30">{nearestEvent.date} · {nearestEvent.discipline}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/events")} className="rounded-xl border-white/[0.08]">
              Все события
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
