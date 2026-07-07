import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  CalendarDays,
  Clock,
  Trophy,
  MapPin,
  Target,
  TrendingDown,
  Flag,
  Timer,
  X,
  Loader2,
} from "lucide-react";

const priorityColors = {
  A: "text-chart-5 border-chart-5/30 bg-chart-5/10",
  B: "text-chart-3 border-chart-3/30 bg-chart-3/10",
  C: "text-muted-foreground border-border bg-muted/30",
} as const;

const priorityLabels = {
  A: "A-старт (главный)",
  B: "B-старт (тренировочный)",
  C: "C-старт (для опыта)",
} as const;

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Events() {
  const events = useQuery(api.events.list);
  const profile = useQuery(api.athletes.getProfile);
  const addEvent = useMutation(api.events.add);
  const updateEvent = useMutation(api.events.update);
  const removeEvent = useMutation(api.events.remove);

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    date: "",
    discipline: "",
    targetTime: "",
    priority: "B" as "A" | "B" | "C",
    location: "",
    notes: "",
  });
  const [resultForm, setResultForm] = useState({ time: "", notes: "" });
  const [showResult, setShowResult] = useState<string | null>(null);

  const upcoming = (events ?? []).filter((e) => !e.completed);
  const past = (events ?? []).filter((e) => e.completed);

  const handleAdd = async () => {
    await addEvent({
      name: form.name,
      date: form.date,
      discipline: form.discipline,
      targetTime: form.targetTime || undefined,
      priority: form.priority,
      location: form.location || undefined,
      notes: form.notes || undefined,
    });
    setForm({ name: "", date: "", discipline: "", targetTime: "", priority: "B", location: "", notes: "" });
    setShowAdd(false);
  };

  const handleResult = async (eventId: string) => {
    await updateEvent({
      id: eventId as never,
      completed: true,
      result: { time: resultForm.time, notes: resultForm.notes || undefined },
    });
    setShowResult(null);
    setResultForm({ time: "", notes: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">События</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Целевые старты и результаты
          </p>
        </div>
        <Sheet open={showAdd} onOpenChange={setShowAdd}>
          <SheetTrigger asChild>
            <Button className="glass-highlight">
              <Plus className="mr-2 h-4 w-4" />
              Добавить событие
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Новое событие</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Напр. Московский марафон"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Дата</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Дисциплина</Label>
                  <Input
                    value={form.discipline}
                    onChange={(e) => setForm({ ...form, discipline: e.target.value })}
                    placeholder="Марафон, 10 км..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Целевое время</Label>
                  <Input
                    value={form.targetTime}
                    onChange={(e) => setForm({ ...form, targetTime: e.target.value })}
                    placeholder="3:30:00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Приоритет</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => setForm({ ...form, priority: v as "A" | "B" | "C" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Локация</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <Button className="w-full" onClick={handleAdd} disabled={!form.name || !form.date}>
                Сохранить
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Upcoming events */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          Предстоящие ({upcoming.length})
        </h2>
        {upcoming.length === 0 && (
          <div className="glass rounded-xl p-8 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Нет предстоящих событий</p>
          </div>
        )}
        {upcoming.map((event) => {
          const days = daysUntil(event.date);
          const isClose = days <= 21;
          return (
            <motion.div
              key={event._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass rounded-xl p-4 border-l-2 ${
                event.priority === "A"
                  ? "border-l-chart-5"
                  : event.priority === "B"
                    ? "border-l-chart-3"
                    : "border-l-border"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    event.priority === "A" ? "bg-chart-5/10" : event.priority === "B" ? "bg-chart-3/10" : "bg-muted"
                  }`}>
                    <Flag className={`h-5 w-5 ${
                      event.priority === "A" ? "text-chart-5" : event.priority === "B" ? "text-chart-3" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{event.name}</p>
                      <Badge
                        variant="outline"
                        className={`text-xs ${priorityColors[event.priority]}`}
                      >
                        {event.priority}-старт
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {event.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {event.discipline}
                      </span>
                      {event.targetTime && (
                        <span className="flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          {event.targetTime}
                        </span>
                      )}
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <div className="text-center">
                    <p className={`text-lg font-bold ${isClose ? "text-chart-5" : "text-primary"}`}>
                      {days < 0 ? "—" : days}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {days < 0 ? "Прошло" : days === 0 ? "Сегодня!" : "дней"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {!event.completed && (
                      <button
                        onClick={() => setShowResult(event._id)}
                        className="text-xs text-primary hover:underline"
                      >
                        Результат
                      </button>
                    )}
                    <button
                      onClick={() => removeEvent({ id: event._id })}
                      className="text-xs text-destructive hover:underline"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>

              {/* Taper suggestion */}
              {isClose && days > 0 && (
                <div className="mt-3 glass-subtle rounded-lg p-3 text-xs">
                  <TrendingDown className="h-3.5 w-3.5 inline mr-1.5 text-primary" />
                  Пора начинать тейпер! За {days} дней до старта снижай объём на{" "}
                  {days <= 7 ? "50-60" : days <= 14 ? "30-40" : "15-25"}%.
                </div>
              )}

              {/* Result form */}
              {showResult === event._id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 glass-subtle rounded-lg p-3 space-y-2"
                >
                  <Input
                    placeholder="Фактическое время"
                    value={resultForm.time}
                    onChange={(e) => setResultForm({ ...resultForm, time: e.target.value })}
                  />
                  <Textarea
                    placeholder="Заметки"
                    value={resultForm.notes}
                    onChange={(e) => setResultForm({ ...resultForm, notes: e.target.value })}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleResult(event._id)}>
                      Сохранить
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowResult(null)}
                    >
                      Отмена
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Past events */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Trophy className="h-3.5 w-3.5" />
            История ({past.length})
          </h2>
          {past.map((event) => (
            <div
              key={event._id}
              className="glass rounded-xl p-4 opacity-70"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Trophy className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{event.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                    <span>{event.date}</span>
                    <span>{event.discipline}</span>
                    {event.result?.time && (
                      <span className="text-primary font-medium">
                        Результат: {event.result.time}
                      </span>
                    )}
                    {event.targetTime && (
                      <span>План: {event.targetTime}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
