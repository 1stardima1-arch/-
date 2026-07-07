import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calculator,
  Timer,
  Heart,
  Droplets,
  Apple,
  Footprints,
  TrendingUp,
} from "lucide-react";

// ─── Calculator formulas ───

// Riegel formula: T2 = T1 * (D2/D1)^1.06
function riegelPrediction(
  t1Minutes: number,
  d1: number,
  d2: number
): { minutes: number; formatted: string } {
  const t2 = t1Minutes * Math.pow(d2 / d1, 1.06);
  const h = Math.floor(t2 / 60);
  const m = Math.floor(t2 % 60);
  const s = Math.floor((t2 * 60) % 60);
  return {
    minutes: t2,
    formatted: `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
  };
}

// VDOT: VO2 = -4.60 + 0.182258*v + 0.000104*v² (v in m/min)
function calculateVDOT(
  distanceM: number,
  timeMinutes: number
): { vdot: number; vo2max: number } {
  const v = distanceM / timeMinutes;
  const vo2 =
    -4.6 + 0.182258 * v + 0.000104 * v * v;
  const pct =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * timeMinutes) +
    0.2989558 * Math.exp(-0.1932605 * timeMinutes);
  return { vdot: Math.round(vo2 / pct * 10) / 10, vo2max: Math.round(vo2 * 10) / 10 };
}

// Karvonen zones
function karvonenZones(
  maxHR: number,
  restingHR: number
): { zone: number; min: number; max: number; label: string }[] {
  const reserve = maxHR - restingHR;
  const zoneDefs = [
    { zone: 1, minPct: 0.5, maxPct: 0.6, label: "Восстановительная" },
    { zone: 2, minPct: 0.6, maxPct: 0.7, label: "Аэробная" },
    { zone: 3, minPct: 0.7, maxPct: 0.8, label: "Темповая" },
    { zone: 4, minPct: 0.8, maxPct: 0.9, label: "Пороговая" },
    { zone: 5, minPct: 0.9, maxPct: 1.0, label: "Максимальная" },
  ];
  return zoneDefs.map((z) => ({
    zone: z.zone,
    min: Math.round(z.minPct * reserve + restingHR),
    max: Math.round(z.maxPct * reserve + restingHR),
    label: z.label,
  }));
}

// Fluid loss: base = weight * 8.5, multipliers
function fluidLoss(
  weight: number,
  intensity: "low" | "medium" | "high",
  temperature: number
): { mlPerHour: number; totalFor1h: number } {
  const base = weight * 8.5;
  const intensityMultiplier = { low: 1, medium: 1.3, high: 1.6 };
  const tempMultiplier = temperature > 25 ? 1.3 : temperature > 15 ? 1.1 : 1;
  const mlPerHour = Math.round(
    base * intensityMultiplier[intensity] * tempMultiplier
  );
  return { mlPerHour, totalFor1h: mlPerHour };
}

// Carb loading: 7-10 g/kg weight per day
function carbLoading(weight: number): { min: number; max: number } {
  return { min: Math.round(weight * 7), max: Math.round(weight * 10) };
}

export default function Calculators() {
  const profile = useQuery(api.athletes.getProfile);

  // Riegel state
  const [riegelT1, setRiegelT1] = useState({ h: 3, m: 30 });
  const [riegelD1, setRiegelD1] = useState(42.2);
  const [riegelD2, setRiegelD2] = useState(21.1);
  const riegelResult = riegelPrediction(
    riegelT1.h * 60 + riegelT1.m,
    riegelD1,
    riegelD2
  );

  // VDOT state
  const [vdotDist, setVdotDist] = useState(5000);
  const [vdotTime, setVdotTime] = useState({ h: 0, m: 25, s: 0 });
  const vdotResult = calculateVDOT(
    vdotDist,
    vdotTime.h * 60 + vdotTime.m + vdotTime.s / 60
  );

  // HR zones
  const [hrMax, setHrMax] = useState(profile?.maxHR || 185);
  const [hrRest, setHrRest] = useState(profile?.restingHR || 55);
  const hrZones = karvonenZones(hrMax, hrRest);

  // Fluid loss
  const [fluidWeight, setFluidWeight] = useState(profile?.weight || 70);
  const [fluidIntensity, setFluidIntensity] = useState<
    "low" | "medium" | "high"
  >("medium");
  const [fluidTemp, setFluidTemp] = useState(20);
  const fluidResult = fluidLoss(fluidWeight, fluidIntensity, fluidTemp);

  // Carb loading
  const [carbWeight, setCarbWeight] = useState(profile?.weight || 70);
  const carbResult = carbLoading(carbWeight);

  const calcTabs = [
    {
      id: "riegel",
      label: "Прогноз времени",
      icon: Timer,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Формула Ригеля: T₂ = T₁ × (D₂/D₁)^1.06
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Время на дистанции (ч:мин)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={riegelT1.h}
                  onChange={(e) =>
                    setRiegelT1({ ...riegelT1, h: Number(e.target.value) })
                  }
                  placeholder="Ч"
                  className="w-20"
                />
                <Input
                  type="number"
                  value={riegelT1.m}
                  onChange={(e) =>
                    setRiegelT1({ ...riegelT1, m: Number(e.target.value) })
                  }
                  placeholder="Мин"
                  className="w-20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Дистанция 1 (км)</Label>
              <Input
                type="number"
                value={riegelD1}
                onChange={(e) => setRiegelD1(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Дистанция 2 (км) — прогноз</Label>
            <Input
              type="number"
              value={riegelD2}
              onChange={(e) => setRiegelD2(Number(e.target.value))}
            />
          </div>
          <div className="glass-subtle rounded-xl p-5 text-center">
            <p className="text-sm text-muted-foreground">Прогноз времени</p>
            <p className="text-3xl font-bold text-primary mt-1">
              {riegelResult.formatted}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              на дистанцию {riegelD2} км
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "vdot",
      label: "VDOT",
      icon: TrendingUp,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Дистанция (м)</Label>
              <Input
                type="number"
                value={vdotDist}
                onChange={(e) => setVdotDist(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Время (ч:мин:сек)</Label>
              <div className="flex gap-1.5">
                <Input
                  type="number"
                  value={vdotTime.h}
                  onChange={(e) =>
                    setVdotTime({ ...vdotTime, h: Number(e.target.value) })
                  }
                  placeholder="Ч"
                  className="w-16"
                />
                <Input
                  type="number"
                  value={vdotTime.m}
                  onChange={(e) =>
                    setVdotTime({ ...vdotTime, m: Number(e.target.value) })
                  }
                  placeholder="М"
                  className="w-16"
                />
                <Input
                  type="number"
                  value={vdotTime.s}
                  onChange={(e) =>
                    setVdotTime({ ...vdotTime, s: Number(e.target.value) })
                  }
                  placeholder="С"
                  className="w-16"
                />
              </div>
            </div>
          </div>
          <div className="glass-subtle rounded-xl p-5 text-center">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">VDOT</p>
                <p className="text-2xl font-bold text-primary">
                  {vdotResult.vdot}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">VO₂max</p>
                <p className="text-2xl font-bold text-primary">
                  {vdotResult.vo2max}
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "hr",
      label: "Пульсовые зоны",
      icon: Heart,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Макс. пульс</Label>
              <Input
                type="number"
                value={hrMax}
                onChange={(e) => setHrMax(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Пульс покоя</Label>
              <Input
                type="number"
                value={hrRest}
                onChange={(e) => setHrRest(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-2">
            {hrZones.map((z) => (
              <div
                key={z.zone}
                className="glass-subtle rounded-lg p-3 flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-medium">Зона {z.zone}</p>
                  <p className="text-xs text-muted-foreground">{z.label}</p>
                </div>
                <p className="text-sm font-semibold">
                  {z.min}–{z.max} уд/мин
                </p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "fluid",
      label: "Гидратация",
      icon: Droplets,
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Вес (кг)</Label>
            <Input
              type="number"
              value={fluidWeight}
              onChange={(e) => setFluidWeight(Number(e.target.value))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Интенсивность</Label>
              <div className="flex gap-1">
                {(["low", "medium", "high"] as const).map((i) => (
                  <button
                    key={i}
                    onClick={() => setFluidIntensity(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                      fluidIntensity === i
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {{ low: "Низ.", medium: "Сред.", high: "Выс." }[i]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Температура (°C)</Label>
              <Input
                type="number"
                value={fluidTemp}
                onChange={(e) => setFluidTemp(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="glass-subtle rounded-xl p-5 text-center">
            <p className="text-sm text-muted-foreground">Потеря жидкости</p>
            <p className="text-3xl font-bold text-primary mt-1">
              {fluidResult.mlPerHour} мл/ч
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Рекомендуется пить ~{fluidResult.totalFor1h} мл в час тренировки
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "carbs",
      label: "Углеводная загрузка",
      icon: Apple,
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Вес (кг)</Label>
            <Input
              type="number"
              value={carbWeight}
              onChange={(e) => setCarbWeight(Number(e.target.value))}
            />
          </div>
          <div className="glass-subtle rounded-xl p-5 text-center">
            <p className="text-sm text-muted-foreground">
              Углеводная загрузка за 1-3 дня до старта
            </p>
            <p className="text-3xl font-bold text-primary mt-1">
              {carbResult.min}–{carbResult.max} г/день
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              7–10 г/кг веса в день
            </p>
          </div>
        </div>
      ),
    },
  ];

  const [activeTab, setActiveTab] = useState(calcTabs[0].id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Калькуляторы</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Данные автозаполняются из профиля, можно переопределить
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full overflow-x-auto flex-nowrap glass-subtle">
          {calcTabs.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              className="flex items-center gap-1.5 shrink-0"
            >
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {calcTabs.map((t) => (
          <TabsContent key={t.id} value={t.id} className="mt-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass border-0">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <t.icon className="h-5 w-5 text-primary" />
                    {t.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>{t.content}</CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
