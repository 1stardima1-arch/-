import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState, useCallback } from "react";
import {
  Watch,
  RefreshCw,
  Unplug,
  Link2,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router";

// ─── Device metadata ───

interface DeviceMeta {
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  available: boolean;
  setupUrl?: string;
  unavailableReason?: string;
  note?: string;
}

const deviceInfo: Record<"garmin" | "polar" | "healthConnect", DeviceMeta> = {
  garmin: {
    name: "Garmin",
    description: "Garmin Connect — через твой аккаунт",
    icon: Watch,
    color: "text-chart-1",
    bgColor: "bg-chart-1/10",
    available: true,
    note: "Требуется email и пароль от Garmin Connect. Данные хранятся зашифрованно.",
  },
  polar: {
    name: "Polar",
    description: "Polar AccessLink (OAuth2)",
    icon: Watch,
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
    available: true,
    setupUrl: "https://admin.polaraccesslink.com",
  },
  healthConnect: {
    name: "Health Connect",
    description: "Android Health Connect (через приложение)",
    icon: Smartphone,
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
    available: true,
    note: "Требуется Android-приложение для синхронизации",
  },
};

// ─── Animations ───

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

// ─── Status helpers ───

const statusIcon = (status?: string) => {
  switch (status) {
    case "connected":
      return <CheckCircle2 className="h-4 w-4 text-chart-2" />;
    case "disconnected":
      return <XCircle className="h-4 w-4 text-muted-foreground" />;
    case "unavailable":
      return <AlertCircle className="h-4 w-4 text-chart-5" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const statusLabel = (status?: string) => {
  switch (status) {
    case "connected":
      return "Подключено";
    case "disconnected":
      return "Отключено";
    case "unavailable":
      return "Недоступно";
    default:
      return "Не подключено";
  }
};

// ─── Component ───

export default function Devices() {
  const navigate = useNavigate();
  const devices = useQuery(api.devices.list);
  const connect = useMutation(api.devices.connect);
  const disconnect = useMutation(api.devices.disconnect);
  const syncNow = useMutation(api.devices.syncNow);
  const storeGarminCredentials = useMutation(api.devices.storeGarminCredentials);

  // Garmin modal state
  const [garminModalOpen, setGarminModalOpen] = useState(false);
  const [garminEmail, setGarminEmail] = useState("");
  const [garminPassword, setGarminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [garminConnecting, setGarminConnecting] = useState(false);

  // Sync states
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  // Polar OAuth
  const POLAR_CLIENT_ID = "00000000-0000-0000-0000-000000000000"; // Placeholder — will be set via env
  const polarRedirectUri = `${window.location.origin}/oauth/polar/callback`;

  const getDeviceStatus = (type: "garmin" | "polar" | "healthConnect") => {
    return devices?.find((d) => d.type === type);
  };

  const handleGarminConnect = useCallback(async () => {
    if (!garminEmail.trim() || !garminPassword.trim()) {
      toast.error("Введите email и пароль Garmin Connect");
      return;
    }
    setGarminConnecting(true);
    try {
      await storeGarminCredentials({
        email: garminEmail.trim(),
        password: garminPassword,
      });
      toast.success("Garmin подключён! Запускаем синхронизацию...");
      setGarminModalOpen(false);
      setGarminPassword("");
      // Auto-sync
      await syncNow({ type: "garmin" });
      toast.success("Синхронизация Garmin запущена");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Ошибка подключения Garmin"
      );
    } finally {
      setGarminConnecting(false);
    }
  }, [garminEmail, garminPassword, storeGarminCredentials, syncNow]);

  const handlePolarConnect = useCallback(() => {
    // We need the actual POLAR_CLIENT_ID from env vars on the frontend
    // For now, use a Convex query to get the OAuth URL
    const scope = encodeURIComponent(
      "training_sessions:read sleep:read nightly_recharge:read"
    );
    const redirectUri = encodeURIComponent(polarRedirectUri);

    // Construct the Polar OAuth URL directly
    const authUrl = `https://auth.polar.com/oauth/authorize?response_type=code&client_id=${POLAR_CLIENT_ID}&scope=${scope}&redirect_uri=${redirectUri}`;

    // Mark as connecting
    connect({ type: "polar" }).catch(() => {});
    window.location.href = authUrl;
  }, [connect, polarRedirectUri, POLAR_CLIENT_ID]);

  const handleSync = useCallback(
    async (type: "garmin" | "polar" | "healthConnect") => {
      setSyncing((prev) => ({ ...prev, [type]: true }));
      try {
        await syncNow({ type });
        toast.success(`Синхронизация ${deviceInfo[type].name} запущена`);
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Ошибка синхронизации"
        );
      } finally {
        setSyncing((prev) => ({ ...prev, [type]: false }));
      }
    },
    [syncNow]
  );

  const handleDisconnect = useCallback(
    async (type: "garmin" | "polar" | "healthConnect") => {
      try {
        await disconnect({ type });
        toast.success(`${deviceInfo[type].name} отключён`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Ошибка отключения");
      }
    },
    [disconnect]
  );

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Устройства</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Подключи Garmin или Polar для автоматической синхронизации тренировок
        </p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {(Object.entries(deviceInfo) as [
          "garmin" | "polar" | "healthConnect",
          DeviceMeta
        ][]).map(([type, info]) => {
          const device = getDeviceStatus(type);
          const isConnected = device?.status === "connected";
          const isSyncing = syncing[type];

          return (
            <motion.div key={type} variants={item}>
              <Card className="glass border-0 overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl ${info.bgColor} flex items-center justify-center shrink-0`}
                      >
                        <info.icon className={`h-6 w-6 ${info.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{info.name}</h3>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              isConnected
                                ? "border-chart-2/30 text-chart-2"
                                : ""
                            }`}
                          >
                            {statusIcon(device?.status)}
                            <span className="ml-1">
                              {statusLabel(device?.status)}
                            </span>
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {info.description}
                        </p>
                        {info.note && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {info.note}
                          </p>
                        )}
                        {device?.lastSync && (
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            Последняя синхронизация:{" "}
                            {new Date(device.lastSync).toLocaleString("ru-RU")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {isConnected ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSync(type)}
                            disabled={isSyncing}
                          >
                            {isSyncing ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            {isSyncing ? "Синхр..." : "Синхр."}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDisconnect(type)}
                          >
                            <Unplug className="mr-1.5 h-3.5 w-3.5" />
                            Откл.
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            if (type === "garmin") {
                              setGarminModalOpen(true);
                            } else if (type === "polar") {
                              handlePolarConnect();
                            } else {
                              connect({ type: "healthConnect" });
                            }
                          }}
                          disabled={!info.available}
                          className="glass-highlight"
                        >
                          <Link2 className="mr-1.5 h-3.5 w-3.5" />
                          Подключить
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* How it works */}
      <Card className="glass border-0">
        <CardHeader>
          <CardTitle className="text-base">Как работает синхронизация</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <div>
            <p>
              <strong className="text-foreground">Garmin:</strong> Введи email и
              пароль от Garmin Connect. Мы используем безопасное подключение для
              загрузки твоих тренировок, сна и пульса. Данные хранятся в
              зашифрованном виде. При каждой синхронизации сессия обновляется
              автоматически.
            </p>
          </div>
          <div>
            <p>
              <strong className="text-foreground">Polar:</strong> Нажми
              «Подключить» — откроется страница Polar для авторизации. После
              подтверждения данные тренировок, сна и HRV будут автоматически
              поступать в приложение. Используется официальный OAuth2-протокол
              Polar AccessLink.
            </p>
          </div>
          <div>
            <p>
              <strong className="text-foreground">Health Connect:</strong>{" "}
              Установи Android-приложение AI Coach и настрой Health Connect —
              тренировки появятся на дашборде.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Garmin Credentials Modal */}
      <Dialog open={garminModalOpen} onOpenChange={setGarminModalOpen}>
        <DialogContent className="glass border-0 max-w-sm">
          <DialogHeader>
            <DialogTitle>Подключение Garmin Connect</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Введи email и пароль от твоего аккаунта Garmin Connect. Данные
              будут сохранены в зашифрованном виде и использованы только для
              синхронизации тренировок.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="garmin-email">Email</Label>
              <Input
                id="garmin-email"
                type="email"
                placeholder="your@email.com"
                value={garminEmail}
                onChange={(e) => setGarminEmail(e.target.value)}
                autoComplete="email"
                className="glass border-white/10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="garmin-password">Пароль</Label>
              <div className="relative">
                <Input
                  id="garmin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Пароль Garmin Connect"
                  value={garminPassword}
                  onChange={(e) => setGarminPassword(e.target.value)}
                  autoComplete="current-password"
                  className="glass border-white/10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setGarminModalOpen(false);
                  setGarminPassword("");
                }}
              >
                Отмена
              </Button>
              <Button
                size="sm"
                onClick={handleGarminConnect}
                disabled={garminConnecting}
                className="glass-highlight"
              >
                {garminConnecting ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-1.5 h-4 w-4" />
                )}
                {garminConnecting ? "Подключение..." : "Подключить"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
