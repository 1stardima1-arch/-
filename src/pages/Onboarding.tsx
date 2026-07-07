import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  UserCircle,
  Target,
  Heart,
  AlertTriangle,
  Check,
  Loader2,
} from "lucide-react";

type FormData = {
  gender: "male" | "female" | "other";
  age: number;
  height: number;
  weight: number;
  sports: string[];
  level: "beginner" | "amateur" | "semipro" | "pro";
  experienceYears: number;
  maxHR: number;
  restingHR: number;
  ftp: number;
  thresholdPace: number;
  injuries: { zone: string; type: string; limitation: string }[];
  chronicConditions: string;
  targetName: string;
  targetDate: string;
  targetTime: string;
  targetDiscipline: string;
  weeklyVolumeHours: number;
};

const sportsOptions = [
  { value: "running", label: "Бег" },
  { value: "cycling", label: "Велоспорт" },
  { value: "swimming", label: "Плавание" },
  { value: "skiing", label: "Лыжи" },
  { value: "triathlon", label: "Триатлон" },
  { value: "other", label: "Другое" },
];

const levelOptions = [
  { value: "beginner", label: "Новичок" },
  { value: "amateur", label: "Любитель" },
  { value: "semipro", label: "Полупрофессионал" },
  { value: "pro", label: "Профессионал" },
];

const steps = [
  { id: 1, title: "О себе", icon: UserCircle },
  { id: 2, title: "Физиология", icon: Heart },
  { id: 3, title: "Травмы", icon: AlertTriangle },
  { id: 4, title: "Цели", icon: Target },
];

const emptyForm: FormData = {
  gender: "male",
  age: 30,
  height: 175,
  weight: 70,
  sports: [],
  level: "amateur",
  experienceYears: 2,
  maxHR: 0,
  restingHR: 0,
  ftp: 0,
  thresholdPace: 0,
  injuries: [],
  chronicConditions: "",
  targetName: "",
  targetDate: "",
  targetTime: "",
  targetDiscipline: "",
  weeklyVolumeHours: 5,
};

export default function Onboarding() {
  const navigate = useNavigate();
  const saveProfile = useMutation(api.athletes.saveProfile);
  const profile = useQuery(api.athletes.getProfile);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [injuryZone, setInjuryZone] = useState("");
  const [injuryType, setInjuryType] = useState("");
  const [injuryLimit, setInjuryLimit] = useState("");

  if (profile) {
    navigate("/dashboard");
    return null;
  }

  const update = (partial: Partial<FormData>) =>
    setForm((f) => ({ ...f, ...partial }));

  const toggleSport = (sport: string) => {
    setForm((f) => ({
      ...f,
      sports: f.sports.includes(sport)
        ? f.sports.filter((s) => s !== sport)
        : [...f.sports, sport],
    }));
  };

  const addInjury = () => {
    if (!injuryZone || !injuryType) return;
    update({
      injuries: [
        ...form.injuries,
        { zone: injuryZone, type: injuryType, limitation: injuryLimit },
      ],
    });
    setInjuryZone("");
    setInjuryType("");
    setInjuryLimit("");
  };

  const removeInjury = (i: number) => {
    update({ injuries: form.injuries.filter((_, idx) => idx !== i) });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProfile({
        gender: form.gender,
        age: form.age,
        height: form.height,
        weight: form.weight,
        sports: form.sports as Array<"running" | "cycling" | "swimming" | "skiing" | "triathlon" | "other">,
        level: form.level,
        experienceYears: form.experienceYears,
        maxHR: form.maxHR || undefined,
        restingHR: form.restingHR || undefined,
        ftp: form.sports.includes("cycling") ? form.ftp || undefined : undefined,
        thresholdPace: form.thresholdPace || undefined,
        injuries: form.injuries,
        chronicConditions: form.chronicConditions || undefined,
        targetEvent: form.targetName
          ? {
              name: form.targetName,
              date: form.targetDate,
              targetTime: form.targetTime || undefined,
              discipline: form.targetDiscipline || "running",
            }
          : undefined,
        weeklyVolumeHours: form.weeklyVolumeHours,
      });
      navigate("/dashboard");
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 4));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-glow-radial opacity-30" />
        <div className="bg-grid absolute inset-0" />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-border p-4 flex items-center justify-between glass-subtle">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shadow-[0_0_12px_var(--accent-glow)]">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold">AI Coach</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Шаг {step} из 4
        </div>
      </div>

      {/* Step indicator */}
      <div className="relative z-10 max-w-2xl mx-auto w-full px-4 pt-8 pb-4">
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  step > s.id
                    ? "bg-primary text-primary-foreground"
                    : step === s.id
                      ? "bg-primary/20 text-primary ring-2 ring-primary/30"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s.id ? <Check className="h-4 w-4" /> : s.id}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 rounded transition-colors ${
                    step > s.id ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {steps.map((s) => (
            <span
              key={s.id}
              className={`text-xs ${
                step === s.id ? "text-primary font-medium" : "text-muted-foreground"
              }`}
            >
              {s.title}
            </span>
          ))}
        </div>
      </div>

      {/* Form content */}
      <div className="relative z-10 flex-1 flex items-start justify-center px-4 pb-16">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {/* Step 1: About */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass rounded-xl p-6 space-y-5"
              >
                <h2 className="text-xl font-bold">О себе</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Пол</Label>
                    <Select
                      value={form.gender}
                      onValueChange={(v) => update({ gender: v as "male" | "female" | "other" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Мужской</SelectItem>
                        <SelectItem value="female">Женский</SelectItem>
                        <SelectItem value="other">Другое</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Возраст</Label>
                    <Input
                      type="number"
                      value={form.age}
                      onChange={(e) => update({ age: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Рост (см)</Label>
                    <Input
                      type="number"
                      value={form.height}
                      onChange={(e) => update({ height: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Вес (кг)</Label>
                    <Input
                      type="number"
                      value={form.weight}
                      onChange={(e) => update({ weight: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Вид(ы) спорта</Label>
                  <div className="flex flex-wrap gap-2">
                    {sportsOptions.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => toggleSport(s.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                          form.sports.includes(s.value)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-transparent text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Уровень</Label>
                    <Select
                      value={form.level}
                      onValueChange={(v) =>
                        update({ level: v as typeof form.level })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {levelOptions.map((l) => (
                          <SelectItem key={l.value} value={l.value}>
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Стаж (лет)</Label>
                    <Input
                      type="number"
                      value={form.experienceYears}
                      onChange={(e) =>
                        update({ experienceYears: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Physiology */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass rounded-xl p-6 space-y-5"
              >
                <h2 className="text-xl font-bold">Физиологические показатели</h2>
                <p className="text-sm text-muted-foreground">
                  Если не знаешь точные значения — оставь 0, калькуляторы помогут
                  рассчитать позже.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Макс. пульс (уд/мин)</Label>
                    <Input
                      type="number"
                      value={form.maxHR || ""}
                      onChange={(e) => update({ maxHR: Number(e.target.value) })}
                      placeholder="Напр. 185"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Пульс покоя (уд/мин)</Label>
                    <Input
                      type="number"
                      value={form.restingHR || ""}
                      onChange={(e) =>
                        update({ restingHR: Number(e.target.value) })
                      }
                      placeholder="Напр. 55"
                    />
                  </div>
                </div>
                {form.sports.includes("cycling") && (
                  <div className="space-y-2">
                    <Label>FTP (Вт)</Label>
                    <Input
                      type="number"
                      value={form.ftp || ""}
                      onChange={(e) => update({ ftp: Number(e.target.value) })}
                      placeholder="Напр. 250"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Пороговый темп (мин/км)</Label>
                  <Input
                    type="number"
                    value={form.thresholdPace || ""}
                    onChange={(e) =>
                      update({ thresholdPace: Number(e.target.value) })
                    }
                    placeholder="Напр. 4:30 = 4.5"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: Injuries */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass rounded-xl p-6 space-y-5"
              >
                <h2 className="text-xl font-bold">Травмы и ограничения</h2>
                <div className="space-y-3">
                  <Input
                    placeholder="Зона (напр. колено, поясница)"
                    value={injuryZone}
                    onChange={(e) => setInjuryZone(e.target.value)}
                  />
                  <Input
                    placeholder="Тип (напр. тендинит, растяжение)"
                    value={injuryType}
                    onChange={(e) => setInjuryType(e.target.value)}
                  />
                  <Input
                    placeholder="Ограничение (напр. избегать ударной нагрузки)"
                    value={injuryLimit}
                    onChange={(e) => setInjuryLimit(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addInjury}
                  >
                    Добавить
                  </Button>
                </div>
                {form.injuries.length > 0 && (
                  <div className="space-y-2">
                    {form.injuries.map((inj, i) => (
                      <div
                        key={i}
                        className="glass-subtle rounded-lg p-3 flex justify-between items-start"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {inj.zone} — {inj.type}
                          </p>
                          {inj.limitation && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {inj.limitation}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeInjury(i)}
                          className="text-xs text-destructive hover:underline ml-2 shrink-0"
                        >
                          Удалить
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Хронические состояния</Label>
                  <Textarea
                    value={form.chronicConditions}
                    onChange={(e) =>
                      update({ chronicConditions: e.target.value })
                    }
                    placeholder="Напр. астма, гипертония..."
                    rows={2}
                  />
                </div>
              </motion.div>
            )}

            {/* Step 4: Goals */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass rounded-xl p-6 space-y-5"
              >
                <h2 className="text-xl font-bold">Цели</h2>
                <div className="space-y-2">
                  <Label>Название целевого события</Label>
                  <Input
                    value={form.targetName}
                    onChange={(e) => update({ targetName: e.target.value })}
                    placeholder="Напр. Московский марафон"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Дата</Label>
                    <Input
                      type="date"
                      value={form.targetDate}
                      onChange={(e) => update({ targetDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Целевое время</Label>
                    <Input
                      value={form.targetTime}
                      onChange={(e) => update({ targetTime: e.target.value })}
                      placeholder="Напр. 3:30:00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Дисциплина</Label>
                  <Input
                    value={form.targetDiscipline}
                    onChange={(e) =>
                      update({ targetDiscipline: e.target.value })
                    }
                    placeholder="Напр. марафон, 10 км, Ironman 70.3"
                  />
                </div>
                <div className="space-y-3">
                  <Label>Недельный объём тренировок (часов)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[form.weeklyVolumeHours]}
                      min={1}
                      max={25}
                      step={0.5}
                      onValueChange={([v]) => update({ weeklyVolumeHours: v })}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-12 text-right">
                      {form.weeklyVolumeHours}ч
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={step === 1}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>
            {step < 4 ? (
              <Button onClick={nextStep}>
                Далее
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving || form.sports.length === 0}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Сохраняю...
                  </>
                ) : (
                  <>
                    Завершить
                    <Check className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
