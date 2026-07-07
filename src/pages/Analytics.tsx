import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import {
  BarChart3,
  Users,
  Activity,
  Smartphone,
  Clock,
  ShieldAlert,
  Loader2,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

export default function Analytics() {
  const navigate = useNavigate();
  const role = useQuery(api.analytics.getRole);
  const userCount = useQuery(api.analytics.getUserCount);
  const eventCounts = useQuery(api.analytics.getEventCounts);
  const dailyStats = useQuery(api.analytics.getDailyStats, { days: 30 });
  const deviceStats = useQuery(api.analytics.getDeviceStats);
  const recentEvents = useQuery(api.analytics.getRecentEvents, { limit: 30 });

  // Not admin — show access denied
  if (role === "user") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold">Доступ запрещён</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Только администраторы имеют доступ к аналитике.
          </p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            На дашборд
          </Button>
        </div>
      </div>
    );
  }

  // Loading
  if (!role || !userCount || !eventCounts) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  // Process event counts for chart
  const eventChartData = Object.entries(eventCounts).map(([name, count]) => ({
    name: {
      page_view: "Просмотры",
      sign_in: "Вход",
      feature_use: "Фичи",
      device_connect: "Устройства",
      sync_run: "Синхр.",
      coach_chat: "Чат AI",
    }[name] || name,
    count,
  }));

  // Generate daily chart data
  const dailyChartData = dailyStats?.map((d) => ({
    date: d.date.slice(5),
    total: d.total,
  })) ?? [];

  const totalEvents = Object.values(eventCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Аналитика приложения
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Статистика использования для администраторов
          </p>
        </div>
        <Badge variant="outline" className="text-chart-1 border-chart-1/30">
          Admin
        </Badge>
      </div>

      {/* Stats cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <motion.div variants={item}>
          <Card className="glass border-0">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Пользователи</p>
                  <p className="text-2xl font-bold text-chart-1 mt-1">{userCount.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {userCount.verified} email · {userCount.anonymous} аноним
                  </p>
                </div>
                <Users className="h-5 w-5 text-chart-1/50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass border-0">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">События</p>
                  <p className="text-2xl font-bold text-chart-2 mt-1">{totalEvents}</p>
                  <p className="text-xs text-muted-foreground mt-1">всего записано</p>
                </div>
                <Activity className="h-5 w-5 text-chart-2/50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass border-0">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Устройства</p>
                  <p className="text-2xl font-bold text-chart-4 mt-1">{deviceStats?.connected ?? 0} / {deviceStats?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">подключено / всего</p>
                </div>
                <Smartphone className="h-5 w-5 text-chart-4/50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass border-0">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">За 30 дней</p>
                  <p className="text-2xl font-bold text-chart-3 mt-1">
                    {dailyChartData.reduce((a, d) => a + d.total, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">активность</p>
                </div>
                <TrendingUp className="h-5 w-5 text-chart-3/50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Daily activity chart */}
      <motion.div variants={item} initial="hidden" animate="show">
        <Card className="glass border-0">
          <CardHeader className="pb-0">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Ежедневная активность — 30 дней
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyChartData}>
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
                <Bar
                  dataKey="total"
                  fill="oklch(0.72 0.18 230)"
                  radius={[4, 4, 0, 0]}
                  opacity={0.8}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Events breakdown */}
      <motion.div variants={item} initial="hidden" animate="show">
        <Card className="glass border-0">
          <CardHeader className="pb-0">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Типы событий
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {eventChartData
                .sort((a, b) => b.count - a.count)
                .map((e) => (
                  <div
                    key={e.name}
                    className="glass-subtle rounded-lg p-3 flex items-center justify-between"
                  >
                    <span className="text-sm">{e.name}</span>
                    <Badge variant="secondary">{e.count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Device stats */}
      {deviceStats && (
        <motion.div variants={item} initial="hidden" animate="show">
          <Card className="glass border-0">
            <CardHeader className="pb-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                Статистика устройств
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="glass-subtle rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground">Garmin</p>
                  <p className="text-xl font-bold text-chart-1 mt-1">{deviceStats.byType.garmin}</p>
                </div>
                <div className="glass-subtle rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground">Polar</p>
                  <p className="text-xl font-bold text-chart-4 mt-1">{deviceStats.byType.polar}</p>
                </div>
                <div className="glass-subtle rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground">Health</p>
                  <p className="text-xl font-bold text-chart-2 mt-1">{deviceStats.byType.healthConnect}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recent events log */}
      <motion.div variants={item} initial="hidden" animate="show">
        <Card className="glass border-0">
          <CardHeader className="pb-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Последние события
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {recentEvents?.map((e) => (
                <div
                  key={e._id}
                  className="text-xs flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0"
                >
                  <span className="text-muted-foreground shrink-0 w-16">
                    {new Date(e.timestamp).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {e.event}
                  </Badge>
                  <span className="text-muted-foreground truncate">
                    {e.path || e.properties || ""}
                  </span>
                </div>
              ))}
              {(!recentEvents || recentEvents.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Пока нет событий. Активность появится, когда пользователи начнут пользоваться приложением.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
