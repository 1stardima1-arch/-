import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Apple, Plus, Flame, Beef, Wheat, Droplets, X, Utensils,
  Coffee, Wine, Smartphone, Sun, Moon, Target, Loader2,
  ChevronDown, ChevronUp, Sparkles, TrendingUp
} from "lucide-react";

const mealTypeLabels: Record<string, { label: string; icon: string }> = {
  breakfast: { label: "Завтрак", icon: "🌅" },
  lunch: { label: "Обед", icon: "☀️" },
  dinner: { label: "Ужин", icon: "🌙" },
  snack: { label: "Перекус", icon: "🍎" },
  preWorkout: { label: "До тренировки", icon: "⚡" },
  postWorkout: { label: "После тренировки", icon: "🔄" },
};

export default function Nutrition() {
  const profile = useQuery(api.athletes.getProfile);
  const todayLog = useQuery(api.nutrition.getTodayLog);
  const todayTargets = useQuery(api.nutrition.getTodayTargets);
  const logMeal = useMutation(api.nutrition.logMeal);
  const deleteMeal = useMutation(api.nutrition.deleteMeal);
  const setTargets = useMutation(api.nutrition.setTargets);
  const journalToday = useQuery(api.journal.getToday);
  const logJournal = useMutation(api.journal.logEntry);

  const [showAdd, setShowAdd] = useState(false);
  const [mealType, setMealType] = useState("breakfast");
  const [foodName, setFoodName] = useState("");
  const [foodCal, setFoodCal] = useState(0);
  const [foodProtein, setFoodProtein] = useState(0);
  const [foodCarbs, setFoodCarbs] = useState(0);
  const [foodFat, setFoodFat] = useState(0);
  const [foodAmount, setFoodAmount] = useState("");
  const [foods, setFoods] = useState<{ name: string; calories?: number; protein?: number; carbs?: number; fat?: number; amount?: string }[]>([]);
  const [mealNotes, setMealNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile && !todayTargets) {
      const weight = profile.weight;
      const bmr = profile.gender === "male"
        ? 10 * weight + 6.25 * profile.height - 5 * profile.age + 5
        : 10 * weight + 6.25 * profile.height - 5 * profile.age - 161;
      const tdee = Math.round(bmr * 1.55);
      const protein = Math.round(weight * 1.8);
      const fat = Math.round((tdee * 0.25) / 9);
      const carbs = Math.round((tdee - protein * 4 - fat * 9) / 4);
      const today = new Date().toISOString().slice(0, 10);
      setTargets({ date: today, calories: tdee, protein, carbs, fat, waterMl: Math.round(weight * 35) });
    }
  }, [profile, todayTargets, setTargets]);

  const totals = (todayLog ?? []).reduce(
    (acc, m) => ({ cal: acc.cal + (m.totalCalories ?? 0), protein: acc.protein + (m.totalProtein ?? 0), carbs: acc.carbs + (m.totalCarbs ?? 0), fat: acc.fat + (m.totalFat ?? 0) }),
    { cal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const addFoodItem = () => {
    if (!foodName) return;
    setFoods([...foods, { name: foodName, calories: foodCal || undefined, protein: foodProtein || undefined, carbs: foodCarbs || undefined, fat: foodFat || undefined, amount: foodAmount || undefined }]);
    setFoodName(""); setFoodCal(0); setFoodProtein(0); setFoodCarbs(0); setFoodFat(0); setFoodAmount("");
  };

  const handleLogMeal = async () => {
    if (foods.length === 0) return;
    setSaving(true);
    await logMeal({ date: new Date().toISOString().slice(0, 10), mealType: mealType as "breakfast" | "lunch" | "dinner" | "snack" | "preWorkout" | "postWorkout", foods, notes: mealNotes || undefined });
    setFoods([]); setMealNotes(""); setShowAdd(false); setSaving(false);
  };

  const t = todayTargets;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white/90">Питание</h1>
          <p className="text-sm text-white/30 mt-0.5">Трекинг калорий, БЖУ и водного баланса</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 border-0 shadow-lg shadow-violet-500/20">
          <Plus className="mr-2 h-4 w-4" /> Записать приём
        </Button>
      </div>

      {/* Macro progress */}
      {t && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Flame, label: "Калории", current: totals.cal, target: t.calories, unit: "", color: "text-amber-400" },
            { icon: Beef, label: "Белок", current: totals.protein, target: t.protein, unit: "г", color: "text-rose-400" },
            { icon: Wheat, label: "Углеводы", current: totals.carbs, target: t.carbs, unit: "г", color: "text-amber-300" },
            { icon: Droplets, label: "Жиры", current: totals.fat, target: t.fat, unit: "г", color: "text-blue-400" },
          ].map((m) => (
            <Card key={m.label} className="border-0 bg-white/[0.02]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <m.icon className={`h-4 w-4 ${m.color}`} />
                  <span className="text-[11px] text-white/30 uppercase">{m.label}</span>
                </div>
                <p className="text-xl font-bold text-white/80">
                  {m.current}<span className="text-sm text-white/20 font-normal"> / {m.target}{m.unit}</span>
                </p>
                <Progress value={Math.min((m.current / m.target) * 100, 100)} className="mt-2 h-1 bg-white/[0.04]" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Meal list */}
      <Card className="border-0 bg-white/[0.01]">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium text-white/50">Сегодня</CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          {(todayLog?.length ?? 0) === 0 ? (
            <p className="text-sm text-white/15 text-center py-6">Нет записей за сегодня</p>
          ) : (
            <div className="space-y-1.5">
              {(todayLog ?? []).map((meal) => (
                <div key={meal._id} className="flex items-start justify-between p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{mealTypeLabels[meal.mealType]?.icon || "🍽️"}</span>
                      <p className="text-sm font-medium text-white/70">{mealTypeLabels[meal.mealType]?.label || meal.mealType}</p>
                      {meal.totalCalories ? <span className="text-xs text-white/25">{meal.totalCalories} ккал</span> : null}
                    </div>
                    <p className="text-xs text-white/20 mt-1 ml-6">{(meal.foods ?? []).map((f) => f.name).join(", ")}</p>
                  </div>
                  <button onClick={() => deleteMeal({ id: meal._id })} className="text-white/15 hover:text-rose-400 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add meal form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <Card className="border-0 bg-white/[0.02]">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold text-white/70">Добавить приём пищи</h3>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(mealTypeLabels).map(([k, v]) => (
                    <button key={k} onClick={() => setMealType(k)} className={`px-3 py-1.5 rounded-xl text-xs transition-all ${mealType === k ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-white/[0.02] text-white/25 border border-white/[0.04]"}`}>
                      {v.icon} {v.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Продукт" value={foodName} onChange={(e) => setFoodName(e.target.value)} className="flex-1 rounded-xl bg-white/[0.03] border-white/[0.06] h-10 text-sm" />
                  <Input placeholder="г/мл" value={foodAmount} onChange={(e) => setFoodAmount(e.target.value)} className="w-20 rounded-xl bg-white/[0.03] border-white/[0.06] h-10 text-sm" />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Input type="number" placeholder="Ккал" value={foodCal || ""} onChange={(e) => setFoodCal(Number(e.target.value))} className="rounded-xl bg-white/[0.03] border-white/[0.06] h-10 text-sm" />
                  <Input type="number" placeholder="Белки" value={foodProtein || ""} onChange={(e) => setFoodProtein(Number(e.target.value))} className="rounded-xl bg-white/[0.03] border-white/[0.06] h-10 text-sm" />
                  <Input type="number" placeholder="Угл." value={foodCarbs || ""} onChange={(e) => setFoodCarbs(Number(e.target.value))} className="rounded-xl bg-white/[0.03] border-white/[0.06] h-10 text-sm" />
                  <Input type="number" placeholder="Жиры" value={foodFat || ""} onChange={(e) => setFoodFat(Number(e.target.value))} className="rounded-xl bg-white/[0.03] border-white/[0.06] h-10 text-sm" />
                </div>
                <Button variant="outline" size="sm" onClick={addFoodItem} disabled={!foodName} className="rounded-xl border-white/[0.08]">+ Добавить продукт</Button>
                {foods.length > 0 && (
                  <div className="space-y-1">
                    {foods.map((f, i) => (
                      <div key={i} className="flex justify-between items-center p-2 rounded-xl bg-white/[0.02] text-sm text-white/40">
                        <span>{f.name} {f.amount ? `(${f.amount})` : ""}</span>
                        <button onClick={() => setFoods(foods.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <Textarea placeholder="Заметки" value={mealNotes} onChange={(e) => setMealNotes(e.target.value)} rows={2} className="rounded-xl bg-white/[0.03] border-white/[0.06] text-sm" />
                <div className="flex gap-2">
                  <Button onClick={handleLogMeal} disabled={foods.length === 0 || saving} className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Utensils className="mr-2 h-4 w-4" />} Сохранить
                  </Button>
                  <Button variant="ghost" onClick={() => setShowAdd(false)} className="rounded-xl">Отмена</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wellness journal */}
      <Card className="border-0 bg-white/[0.01]">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium text-white/50 flex items-center gap-2">
            <Target className="h-4 w-4" /> Журнал самочувствия
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <p className="text-xs text-white/20 mb-3">Отмечай факторы, влияющие на восстановление:</p>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "alcohol", label: "Алкоголь", icon: Wine, value: journalToday?.alcohol },
              { key: "caffeine", label: "Кофеин", icon: Coffee, value: journalToday?.caffeine },
              { key: "screenBeforeSleep", label: "Экран перед сном", icon: Smartphone, value: journalToday?.screenBeforeSleep ? `${journalToday.screenBeforeSleep}ч` : null },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  const update: Record<string, unknown> = { date: today };
                  if (item.key === "alcohol") update.alcohol = !journalToday?.alcohol;
                  if (item.key === "caffeine") update.caffeine = !journalToday?.caffeine;
                  logJournal(update as Parameters<typeof logJournal>[0]);
                }}
                className={`rounded-xl px-3 py-2 text-xs border transition-all flex items-center gap-1.5 ${item.value ? "border-violet-500/30 bg-violet-500/5 text-violet-300" : "border-white/[0.04] text-white/25 hover:text-white/40"}`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}{item.value ? " ✓" : ""}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recovery insight */}
      {totals.protein > 0 && t && (
        <Card className="border-0 bg-gradient-to-r from-violet-500/3 to-indigo-500/3">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white/70">AI-анализ питания</p>
                <p className="text-xs text-white/30 mt-1">
                  {totals.protein >= t.protein * 0.8
                    ? `✅ Белок: ${totals.protein}/${t.protein}г — отлично для восстановления мышц`
                    : `⚠️ Белок: ${totals.protein}/${t.protein}г — добавь ${t.protein - totals.protein}г для лучшего восстановления`}
                  {" · "}
                  {totals.cal >= t.calories * 0.9
                    ? `Калории в норме (${totals.cal}/${t.calories})`
                    : `Дефицит калорий: ${totals.cal}/${t.calories} — может замедлить восстановление`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
