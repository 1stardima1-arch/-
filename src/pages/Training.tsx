import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Plus,
  Filter,
  Timer,
  Footprints,
  Heart,
  Flame,
  Mountain,
  X,
  ChevronRight,
  Loader2,
} from "lucide-react";

const sportLabels: Record<string, string> = {
  running: "Бег",
  cycling: "Велоспорт",
  swimming: "Плавание",
  skiing: "Лыжи",
  triathlon: "Триатлон",
  other: "Другое",
};

const sportIcons: Record<string, React.ElementType> = {
  running: Footprints,
  cycling: Timer,
  swimming: Timer,
  skiing: Mountain,
  triathlon: Timer,
  other: Timer,
};

export default function Training() {
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const activities = useQuery(api.activities.list, {
    sport: sportFilter !== "all" ? (sportFilter as "running" | "cycling" | "swimming" | "skiing" | "triathlon" | "other") : undefined,
    limit: 50,
  });
  const addActivity = useMutation(api.activities.add);
  const removeActivity = useMutation(api.activities.remove);

  const [form, setForm] = useState({
    sport: "running" as string,
    date: new Date().toISOString().slice(0, 10),
    duration: 60,
    distance: 0,
    pace: 0,
    avgHR: 0,
    maxHR: 0,
    tss: 0,
    elevation: 0,
    calories: 0,
    notes: "",
    title: "",
    planned: false,
  });

  const handleAdd = async () => {
    await addActivity({
      sport: form.sport as "running" | "cycling" | "swimming" | "skiing" | "triathlon" | "other",
      date: form.date,
      duration: form.duration,
      distance: form.distance || undefined,
      pace: form.pace || undefined,
      avgHR: form.avgHR || undefined,
      maxHR: form.maxHR || undefined,
      tss: form.tss || undefined,
      elevation: form.elevation || undefined,
      calories: form.calories || undefined,
      notes: form.notes || undefined,
      title: form.title || undefined,
      planned: form.planned,
    });
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Тренировки</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Выполненные и запланированные
          </p>
        </div>
        <Sheet open={showAdd} onOpenChange={setShowAdd}>
          <SheetTrigger asChild>
            <Button className="glass-highlight">
              <Plus className="mr-2 h-4 w-4" />
              Добавить
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Новая тренировка</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Напр. Темповый бег 10 км"
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
                  <Label>Спорт</Label>
                  <Select
                    value={form.sport}
                    onValueChange={(v) => setForm({ ...form, sport: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(sportLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Длительность (сек)</Label>
                  <Input
                    type="number"
                    value={form.duration}
                    onChange={(e) =>
                      setForm({ ...form, duration: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Дистанция (км)</Label>
                  <Input
                    type="number"
                    value={form.distance || ""}
                    onChange={(e) =>
                      setForm({ ...form, distance: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Средний пульс</Label>
                  <Input
                    type="number"
                    value={form.avgHR || ""}
                    onChange={(e) =>
                      setForm({ ...form, avgHR: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Макс. пульс</Label>
                  <Input
                    type="number"
                    value={form.maxHR || ""}
                    onChange={(e) =>
                      setForm({ ...form, maxHR: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>TSS</Label>
                  <Input
                    type="number"
                    value={form.tss || ""}
                    onChange={(e) =>
                      setForm({ ...form, tss: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Набор высоты (м)</Label>
                  <Input
                    type="number"
                    value={form.elevation || ""}
                    onChange={(e) =>
                      setForm({ ...form, elevation: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Заметки</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <Button className="w-full" onClick={handleAdd}>
                Сохранить
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["all", ...Object.keys(sportLabels)].map((s) => (
          <Button
            key={s}
            variant={sportFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setSportFilter(s)}
            className="shrink-0"
          >
            {s === "all" ? "Все" : sportLabels[s]}
          </Button>
        ))}
      </div>

      {/* Activity list */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-2"
      >
        {activities?.length === 0 && (
          <div className="glass rounded-xl p-10 text-center">
            <Timer className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold">Нет тренировок</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Добавь свою первую тренировку
            </p>
          </div>
        )}
        {(activities ?? []).map((a) => {
          const Icon = sportIcons[a.sport] || Timer;
          return (
            <motion.div
              key={a._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 group hover:glass-elevated transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">
                      {a.title || sportLabels[a.sport] || "Тренировка"}
                    </p>
                    <Badge
                      variant={a.planned ? "outline" : "default"}
                      className="text-xs"
                    >
                      {a.planned ? "План" : "Вып."}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {Math.round(a.duration / 60)} мин
                    </span>
                    {a.distance && (
                      <span className="flex items-center gap-1">
                        <Footprints className="h-3 w-3" />
                        {a.distance.toFixed(1)} км
                      </span>
                    )}
                    {a.tss && (
                      <span className="flex items-center gap-1">
                        <Flame className="h-3 w-3" />
                        TSS {a.tss}
                      </span>
                    )}
                    {a.elevation && (
                      <span className="flex items-center gap-1">
                        <Mountain className="h-3 w-3" />
                        {a.elevation}м
                      </span>
                    )}
                    <span>{a.date?.slice(5)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeActivity({ id: a._id })}
                className="text-muted-foreground hover:text-destructive transition-colors self-end sm:self-center"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
