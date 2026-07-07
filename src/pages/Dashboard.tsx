import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Heart,
  Moon,
  Battery,
  TrendingUp,
  Timer,
  Activity,
  ArrowRight,
  MessageCircle,
  Zap,
  Gauge,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  sub,
  color = "text-primary",
  progress,
}: {
  title: string;
  value: number | string;
  unit?: string;
  icon: React.ElementType;
  sub?: string;
  color?: string;
  progress?: number;
}) {
  return (
    <Card className="glass border-0 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {title}
            </p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-2xl font-bold ${color}`}>{value}</span>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
            {sub && (
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            )}
          </div>
          <div className={`w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center`}>
            <Icon className={`h-4.5 w-4.5 ${color}`} />
          </div>
        </div>
        {progress !== undefined && (
          <Progress value={progress} className="mt-3 h-1.5" />
        )}
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
    if (isOnboarded === false) {
      navigate("/onboarding");
    }
  }, [isOnboarded, navigate]);

  if (!isOnboarded) return null;

  // Build HRV chart data
  const hrvData = (recentMetrics ?? [])
    .filter((m) => m.hrv)
    .map((m) => ({ date: m.date.slice(5), hrv: m.hrv }));

  const avgHRV =
    hrvData.length > 0
      ? hrvData.reduce((s, d) => s + (d.hrv ?? 0), 0) / hrvData.length
      : 0;

  // Build PMC chart data
  const pmcData = (performance ?? []).map((p) => ({
    date: p.date.slice(5),
    ctl: Math.round(p.ctl),
    atl: Math.round(p.atl),
    tsb: Math.round(p.tsb),
  }));

  const nearestEvent = upcomingEvents?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Привет{profile?.gender === "male" ? "" : ""}, спортсмен!
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {profile?.sports
              ?.map(
                (s) =>
                  ({ running: "Бег", cycling: "Вело", swimming: "Плавание", skiing: "Лыжи", triathlon: "Триатлон", other: "Другое" }[
                    s
                  ])
              )
              .join(" · ") || "Спортсмен"}
            {" · "}
            {{
              beginner: "Новичок",
              amateur: "Любитель",
              semipro: "Полупро",
              pro: "Про",
            }[profile?.level ?? "amateur"] || ""}
          </p>
        </div>
        <Button
          className="glass-highlight"
          onClick={() => navigate("/coach")}
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          AI Тренер
        </Button>
      </div>

      {/* Empty state */}
      {!todayMetrics && recentActivities?.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-8 text-center"
        >
          <Watch className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold">У тебя пока нет тренировок</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Подключи Garmin/Polar или добавь тренировку вручную
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button variant="outline" size="sm" onClick={() => navigate("/devices")}>
              Подключить устройство
            </Button>
            <Button size="sm" onClick={() => navigate("/training")}>
              Добавить тренировку
            </Button>
          </div>
        </motion.div>
      )}

      {/* Metrics grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <motion.div variants={item}>
          <MetricCard
            title="Recovery Score"
            value={todayMetrics?.recoveryScore ?? "--"}
            unit="из 100"
            icon={Heart}
            color={todayMetrics?.recoveryScore && todayMetrics.recoveryScore >= 70 ? "text-chart-2" : "text-chart-5"}
            sub={todayMetrics?.recoveryScore ? (todayMetrics.recoveryScore >= 70 ? "Хорошее" : "Низкое") : "Нет данных"}
            progress={todayMetrics?.recoveryScore ?? 0}
          />
        </motion.div>
        <motion.div variants={item}>
          <MetricCard
            title="Пульс покоя"
            value={todayMetrics?.restingHR ?? "--"}
            unit="уд/мин"
            icon={Activity}
            color="text-chart-1"
            sub={profile?.restingHR ? `${profile.restingHR} уд/мин норма` : undefined}
          />
        </motion.div>
        <motion.div variants={item}>
          <MetricCard
            title="Сон"
            value={todayMetrics?.sleepDuration ? (todayMetrics.sleepDuration / 60).toFixed(1) : "--"}
            unit="ч"
            icon={Moon}
            color="text-chart-4"
            sub={
              todayMetrics?.sleepEfficiency
                ? `Эфф. ${todayMetrics.sleepEfficiency}%`
                : undefined
            }
          />
        </motion.div>
        <motion.div variants={item}>
          <MetricCard
            title="Body Battery"
            value={todayMetrics?.bodyBattery ?? "--"}
            unit="из 100"
            icon={Battery}
            color={todayMetrics?.bodyBattery && todayMetrics.bodyBattery >= 60 ? "text-chart-2" : "text-chart-3"}
            progress={todayMetrics?.bodyBattery ?? 0}
          />
        </motion.div>
      </motion.div>

      {/* PMC Chart */}
      {pmcData.length > 0 && (
        <motion.div variants={item} initial="hidden" animate="show">
          <Card className="glass border-0">
            <CardHeader className="pb-0">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                PMC-график (CTL/ATL/TSB) — 90 дней
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={pmcData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                  <XAxis
                    dataKey="date"
                    stroke="oklch(0.65 0.01 260)"
                    fontSize={11}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="oklch(0.65 0.01 260)"
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.18 0.012 260)",
                      border: "1px solid oklch(1 0 0 / 0.08)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <ReferenceLine y={0} stroke="oklch(1 0 0 / 0.15)" />
                  <Line
                    type="monotone"
                    dataKey="ctl"
                    stroke="oklch(0.72 0.18 230)"
                    strokeWidth={2}
                    dot={false}
                    name="CTL"
                  />
                  <Line
                    type="monotone"
                    dataKey="atl"
                    stroke="oklch(0.68 0.21 160)"
                    strokeWidth={2}
                    dot={false}
                    name="ATL"
                  />
                  <Line
                    type="monotone"
                    dataKey="tsb"
                    stroke="oklch(0.75 0.2 80)"
                    strokeWidth={2}
                    dot={false}
                    name="TSB"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* HRV trend + Training status */}
      <div className="grid lg:grid-cols-2 gap-4">
        {hrvData.length > 3 && (
          <motion.div variants={item} initial="hidden" animate="show">
            <Card className="glass border-0">
              <CardHeader className="pb-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-primary" />
                  HRV тренд — 30 дней
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={hrvData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                    <XAxis
                      dataKey="date"
                      stroke="oklch(0.65 0.01 260)"
                      fontSize={10}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      stroke="oklch(0.65 0.01 260)"
                      fontSize={10}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.18 0.012 260)",
                        border: "1px solid oklch(1 0 0 / 0.08)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <ReferenceLine
                      y={avgHRV}
                      stroke="oklch(0.72 0.18 230 / 0.5)"
                      strokeDasharray="6 3"
                      label={{
                        value: `Среднее: ${Math.round(avgHRV)}`,
                        position: "right",
                        fill: "oklch(0.65 0.01 260)",
                        fontSize: 10,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="hrv"
                      stroke="oklch(0.72 0.18 230)"
                      strokeWidth={2.5}
                      dot={false}
                      name="HRV"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Training Status */}
        {todayMetrics?.trainingStatus && (
          <motion.div variants={item} initial="hidden" animate="show">
            <Card className="glass border-0">
              <CardHeader className="pb-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Тренировочный статус
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="glass-subtle rounded-lg p-4 text-center">
                  <span className="text-lg font-semibold">{todayMetrics.trainingStatus}</span>
                  {todayMetrics.stressLevel && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Уровень стресса: {todayMetrics.stressLevel}/100
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Recent activities */}
      <motion.div variants={item} initial="hidden" animate="show">
        <Card className="glass border-0">
          <CardHeader className="pb-0 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Timer className="h-4 w-4 text-primary" />
              Последние тренировки
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/training")}
            >
              Все <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            {recentActivities && recentActivities.length > 0 ? (
              <div className="space-y-2">
                {(recentActivities ?? []).slice(0, 5).map((a) => (
                  <div
                    key={a._id}
                    className="glass-subtle rounded-lg p-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {a.title || ({
                          running: "Бег",
                          cycling: "Вело",
                          swimming: "Плавание",
                          skiing: "Лыжи",
                          triathlon: "Триатлон",
                          other: "Тренировка",
                        }[a.sport] || "Тренировка")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.date?.slice(5)}
                        {a.distance ? ` · ${a.distance.toFixed(1)} км` : ""}
                        {a.duration ? ` · ${Math.round(a.duration / 60)} мин` : ""}
                        {a.tss ? ` · TSS ${a.tss}` : ""}
                      </p>
                    </div>
                    <Badge variant={a.planned ? "outline" : "default"} className="text-xs">
                      {a.planned ? "План" : "Выполнено"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                Нет тренировок.{" "}
                <button
                  onClick={() => navigate("/training")}
                  className="text-primary hover:underline"
                >
                  Добавить первую
                </button>
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Nearest event countdown */}
      {nearestEvent && (
        <motion.div variants={item} initial="hidden" animate="show">
          <Card className="glass border-0 border-l-2 border-l-primary">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Ближайший старт
                </p>
                <p className="font-semibold">{nearestEvent.name}</p>
                <p className="text-sm text-muted-foreground">
                  {nearestEvent.date} · {nearestEvent.discipline}
                  {nearestEvent.targetTime ? ` · Цель: ${nearestEvent.targetTime}` : ""}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/events")}>
                Все события
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function Watch({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="7" />
      <polyline points="12 9 12 12 13.5 13.5" />
      <path d="M13 3V1" />
      <path d="M13 23v-2" />
      <path d="M18 3.6l1 2" />
      <path d="M16.2 21.4l.8 1.6" />
    </svg>
  );
}

function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "outline";
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        variant === "default"
          ? "bg-primary/15 text-primary"
          : "border border-border text-muted-foreground"
      } ${className}`}
    >
      {children}
    </span>
  );
}
