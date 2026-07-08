import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router";
import {
  BarChart3, Users, Activity, Smartphone, Clock,
  ShieldAlert, TrendingUp, Zap, Eye, MessageCircle,
  RefreshCw, ArrowRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Analytics() {
  const navigate = useNavigate();
  const role = useQuery(api.analytics.getRole);
  const userCount = useQuery(api.analytics.getUserCount);
  const eventCounts = useQuery(api.analytics.getEventCounts);
  const dailyStats = useQuery(api.analytics.getDailyStats, { days: 30 });
  const deviceStats = useQuery(api.analytics.getDeviceStats);
  const recentEvents = useQuery(api.analytics.getRecentEvents, { limit: 30 });

  if (role === "user") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-white/[0.05] mx-auto" />
          <h2 className="text-xl font-bold text-white/50">Доступ запрещён</h2>
          <p className="text-sm text-white/20 max-w-xs mx-auto">Только администраторы имеют доступ к аналитике.</p>
          <Button variant="outline" onClick={() => navigate("/dashboard")} className="rounded-xl border-white/[0.08]">На дашборд</Button>
        </div>
      </div>
    );
  }

  if (!role || !userCount || !eventCounts) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 bg-white/[0.02]" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-24 rounded-xl bg-white/[0.02]" />)}
        </div>
        <Skeleton className="h-64 rounded-xl bg-white/[0.02]" />
      </div>
    );
  }

  const eventChartData = Object.entries(eventCounts).map(([name, count]) => ({
    name: ({ page_view: "Просмотры", sign_in: "Вход", feature_use: "Фичи", device_connect: "Устройства", sync_run: "Синхр.", coach_chat: "Чат AI" })[name] || name,
    count,
  }));

  const dailyChartData = dailyStats?.map((d) => ({ date: d.date.slice(5), total: d.total })) ?? [];
  const totalEvents = Object.values(eventCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white/90 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-violet-400" /> Аналитика приложения
          </h1>
          <p className="text-sm text-white/30 mt-0.5">Статистика использования</p>
        </div>
        <Badge variant="outline" className="text-violet-400 border-violet-400/20 bg-violet-500/5">Admin</Badge>
      </div>

      {/* Stats cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: "Пользователи", value: userCount.total, sub: `${userCount.verified} email · ${userCount.anonymous} аноним`, color: "text-violet-400" },
          { icon: Activity, label: "События", value: totalEvents, sub: "всего записано", color: "text-emerald-400" },
          { icon: Smartphone, label: "Устройства", value: `${deviceStats?.connected ?? 0}/${deviceStats?.total ?? 0}`, sub: "подключено / всего", color: "text-blue-400" },
          { icon: TrendingUp, label: "За 30 дней", value: dailyChartData.reduce((a, d) => a + d.total, 0), sub: "активность", color: "text-amber-400" },
        ].map((s) => (
          <motion.div key={s.label} variants={item}>
            <Card className="border-0 bg-white/[0.02]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] text-white/30 uppercase tracking-wider">{s.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-white/20 mt-1">{s.sub}</p>
                  </div>
                  <s.icon className={`h-5 w-5 ${s.color}/30`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Daily activity chart */}
      <motion.div variants={item} initial="hidden" animate="show">
        <Card className="border-0 bg-white/[0.02]">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-medium text-white/50 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Ежедневная активность — 30 дней
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dailyChartData}>
                <defs>
                  <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.12)" fontSize={10} tickLine={false} interval="preserveStartEnd" />
                <YAxis stroke="rgba(255,255,255,0.12)" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#12121a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", fontSize: "12px", color: "#fff" }} />
                <Area type="monotone" dataKey="total" stroke="#818cf8" strokeWidth={2} fill="url(#activityGradient)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Events breakdown + devices */}
      <div className="grid md:grid-cols-2 gap-4">
        <motion.div variants={item} initial="hidden" animate="show">
          <Card className="border-0 bg-white/[0.02]">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium text-white/50 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Типы событий
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-1.5">
                {eventChartData.sort((a, b) => b.count - a.count).map((e) => (
                  <div key={e.name} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.02]">
                    <span className="text-sm text-white/50">{e.name}</span>
                    <Badge variant="secondary" className="bg-white/[0.03] text-white/40">{e.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {deviceStats && (
          <motion.div variants={item} initial="hidden" animate="show">
            <Card className="border-0 bg-white/[0.02]">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-medium text-white/50 flex items-center gap-2">
                  <Smartphone className="h-4 w-4" /> Устройства
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Garmin", value: deviceStats.byType.garmin, color: "text-violet-400" },
                    { label: "Polar", value: deviceStats.byType.polar, color: "text-blue-400" },
                    { label: "Health", value: deviceStats.byType.healthConnect, color: "text-emerald-400" },
                  ].map((d) => (
                    <div key={d.label} className="p-4 rounded-xl bg-white/[0.02] text-center">
                      <p className="text-xs text-white/20">{d.label}</p>
                      <p className={`text-xl font-bold mt-1 ${d.color}`}>{d.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Recent events */}
      <motion.div variants={item} initial="hidden" animate="show">
        <Card className="border-0 bg-white/[0.02]">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-medium text-white/50 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Последние события
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-0.5 max-h-64 overflow-y-auto">
              {recentEvents?.map((e) => (
                <div key={e._id} className="text-xs flex items-center gap-2 py-1.5 border-b border-white/[0.03] last:border-0">
                  <span className="text-white/15 shrink-0 w-16">
                    {new Date(e.timestamp).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/[0.04] text-white/25">{e.event}</Badge>
                  <span className="text-white/15 truncate">{e.path || ""}</span>
                </div>
              ))}
              {(!recentEvents || recentEvents.length === 0) && (
                <p className="text-sm text-white/15 text-center py-8">Пока нет событий.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
