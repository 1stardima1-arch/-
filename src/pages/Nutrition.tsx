import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Apple,
  Plus,
  Flame,
  Beef,
  Wheat,
  Droplets,
  TrendingUp,
  Loader2,
  X,
  Target,
  Utensils,
  Sun,
  Moon,
  Coffee,
  Wine,
  Smartphone,
} from "lucide-react";

const mealTypeLabels: Record<string, string> = {
  breakfast: "Завтрак",
  lunch: "Обед",
  dinner: "Ужин",
  snack: "Перекус",
  preWorkout: "До тренировки",
  postWorkout: "После тренировки",
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
  const [foods, setFoods] = useState<
    {
      name: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      amount?: string;
    }[]
  >([]);
  const [mealNotes, setMealNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Auto-calculate targets based on profile
  useEffect(() => {
    if (profile && !todayTargets) {
      const weight = profile.weight;
      const bmr =
        profile.gender === "male"
          ? 10 * weight + 6.25 * profile.height - 5 * profile.age + 5
          : 10 * weight + 6.25 * profile.height - 5 * profile.age - 161;
      const tdee = Math.round(bmr * 1.55); // moderate activity
      const protein = Math.round(weight * 1.8);
      const fat = Math.round((tdee * 0.25) / 9);
      const carbs = Math.round((tdee - protein * 4 - fat * 9) / 4);
      const today = new Date().toISOString().slice(0, 10);
      setTargets({
        date: today,
        calories: tdee,
        protein,
        carbs,
        fat,
        waterMl: Math.round(weight * 35),
      });
    }
  }, [profile, todayTargets, setTargets]);

  const totals = (todayLog ?? []).reduce(
    (acc, meal) => ({
      cal: acc.cal + (meal.totalCalories ?? 0),
      protein: acc.protein + (meal.totalProtein ?? 0),
      carbs: acc.carbs + (meal.totalCarbs ?? 0),
      fat: acc.fat + (meal.totalFat ?? 0),
    }),
    { cal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const addFoodItem = () => {
    if (!foodName) return;
    setFoods([
      ...foods,
      {
        name: foodName,
        calories: foodCal || undefined,
        protein: foodProtein || undefined,
        carbs: foodCarbs || undefined,
        fat: foodFat || undefined,
        amount: foodAmount || undefined,
      },
    ]);
    setFoodName("");
    setFoodCal(0);
    setFoodProtein(0);
    setFoodCarbs(0);
    setFoodFat(0);
    setFoodAmount("");
  };

  const handleLogMeal = async () => {
    if (foods.length === 0) return;
    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    await logMeal({
      date: today,
      mealType: mealType as "breakfast" | "lunch" | "dinner" | "snack" | "preWorkout" | "postWorkout",
      foods,
      notes: mealNotes || undefined,
    });
    setFoods([]);
    setMealNotes("");
    setShowAdd(false);
    setSaving(false);
  };

  const t = todayTargets;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Питание</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Дневник питания и рекомендации
          </p>
        </div>
        <Button className="glass-highlight" onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Записать приём
        </Button>
      </div>

      {/* Macronutrient progress */}
      {t && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="glass border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="h-4 w-4 text-chart-5" />
                <span className="text-xs text-muted-foreground">Калории</span>
              </div>
              <p className="text-xl font-bold">
                {totals.cal}{" "}
                <span className="text-sm text-muted-foreground font-normal">
                  / {t.calories}
                </span>
              </p>
              <Progress
                value={Math.min((totals.cal / t.calories) * 100, 100)}
                className="mt-2 h-1.5"
              />
            </CardContent>
          </Card>
          <Card className="glass border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Beef className="h-4 w-4 text-chart-5" />
                <span className="text-xs text-muted-foreground">Белок</span>
              </div>
              <p className="text-xl font-bold">
                {totals.protein}
                <span className="text-sm text-muted-foreground font-normal">
                  {" "}/ {t.protein}г
                </span>
              </p>
              <Progress
                value={Math.min((totals.protein / t.protein) * 100, 100)}
                className="mt-2 h-1.5"
              />
            </CardContent>
          </Card>
          <Card className="glass border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wheat className="h-4 w-4 text-chart-3" />
                <span className="text-xs text-muted-foreground">Углеводы</span>
              </div>
              <p className="text-xl font-bold">
                {totals.carbs}
                <span className="text-sm text-muted-foreground font-normal">
                  {" "}/ {t.carbs}г
                </span>
              </p>
              <Progress
                value={Math.min((totals.carbs / t.carbs) * 100, 100)}
                className="mt-2 h-1.5"
              />
            </CardContent>
          </Card>
          <Card className="glass border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="h-4 w-4 text-chart-1" />
                <span className="text-xs text-muted-foreground">Жиры</span>
              </div>
              <p className="text-xl font-bold">
                {totals.fat}
                <span className="text-sm text-muted-foreground font-normal">
                  {" "}/ {t.fat}г
                </span>
              </p>
              <Progress
                value={Math.min((totals.fat / t.fat) * 100, 100)}
                className="mt-2 h-1.5"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Meal list */}
      <Card className="glass border-0">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Сегодня</CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          {todayLog?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Нет записей за сегодня
            </p>
          ) : (
            <div className="space-y-2">
              {(todayLog ?? []).map((meal) => (
                <motion.div
                  key={meal._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-subtle rounded-lg p-3 flex items-start justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {mealTypeLabels[meal.mealType] || meal.mealType}
                      </p>
                      {meal.totalCalories && (
                        <span className="text-xs text-muted-foreground">
                          {meal.totalCalories} ккал
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(meal.foods ?? []).map((f) => f.name).join(", ")}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMeal({ id: meal._id })}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add meal */}
      {showAdd && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="glass rounded-xl p-6 space-y-4"
        >
          <h3 className="font-semibold">Добавить приём пищи</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(mealTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Название продукта"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Кол-во"
                value={foodAmount}
                onChange={(e) => setFoodAmount(e.target.value)}
                className="w-24"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Input
                type="number"
                placeholder="Ккал"
                value={foodCal || ""}
                onChange={(e) => setFoodCal(Number(e.target.value))}
              />
              <Input
                type="number"
                placeholder="Белки г"
                value={foodProtein || ""}
                onChange={(e) => setFoodProtein(Number(e.target.value))}
              />
              <Input
                type="number"
                placeholder="Угл. г"
                value={foodCarbs || ""}
                onChange={(e) => setFoodCarbs(Number(e.target.value))}
              />
              <Input
                type="number"
                placeholder="Жиры г"
                value={foodFat || ""}
                onChange={(e) => setFoodFat(Number(e.target.value))}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addFoodItem}
              disabled={!foodName}
            >
              <Plus className="mr-1 h-3 w-3" /> Добавить продукт
            </Button>
          </div>
          {foods.length > 0 && (
            <div className="space-y-1.5">
              {foods.map((f, i) => (
                <div
                  key={i}
                  className="glass-subtle rounded-lg p-2 flex justify-between items-center text-sm"
                >
                  <span>
                    {f.name} {f.amount ? `(${f.amount})` : ""}
                  </span>
                  <button
                    onClick={() => setFoods(foods.filter((_, j) => j !== i))}
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Textarea
            placeholder="Заметки"
            value={mealNotes}
            onChange={(e) => setMealNotes(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleLogMeal}
              disabled={foods.length === 0 || saving}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Utensils className="mr-2 h-4 w-4" />
              )}
              Сохранить
            </Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Отмена
            </Button>
          </div>
        </motion.div>
      )}

      {/* Wellness journal */}
      <Card className="glass border-0">
        <CardHeader className="pb-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Журнал самочувствия
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="flex flex-wrap gap-2">
            {[
              {
                key: "alcohol",
                label: "Алкоголь",
                icon: Wine,
                value: journalToday?.alcohol,
              },
              {
                key: "caffeine",
                label: "Кофеин",
                icon: Coffee,
                value: journalToday?.caffeine,
              },
              {
                key: "screenBeforeSleep",
                label: "Экран перед сном",
                icon: Smartphone,
                value: journalToday?.screenBeforeSleep
                  ? `${journalToday.screenBeforeSleep}ч`
                  : null,
              },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  const update: Record<string, unknown> = { date: today };
                  if (item.key === "alcohol")
                    update.alcohol = !journalToday?.alcohol;
                  if (item.key === "caffeine")
                    update.caffeine = !journalToday?.caffeine;
                  logJournal(update as Parameters<typeof logJournal>[0]);
                }}
                className={`glass-subtle rounded-lg px-3 py-2 text-xs border transition-all ${
                  item.value
                    ? "border-primary/30 bg-primary/5"
                    : "border-transparent"
                }`}
              >
                <item.icon className="h-3.5 w-3.5 inline mr-1.5" />
                {item.label}
                {item.value ? " ✓" : ""}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
