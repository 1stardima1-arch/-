import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
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
  Droplet,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import { GarminBridge } from "@/lib/garmin-bridge";
import { lactateZone } from "@/hooks/use-garmin-lactate-bridge";

// ─── Secondary device metadata (Garmin / Polar / Health Connect) ───

type OtherDeviceType = "garmin" | "polar" | "healthConnect";

interface DeviceMeta {
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const otherDeviceInfo: Record<OtherDeviceType, DeviceMeta> = {
  garmin: {
    name: "Garmin",
    description: "Garmin Connect — через твой аккаунт",
    icon: Watch,
    color: "text-chart-1",
    bgColor: "bg-chart-1/10",
  },
  polar: {
    name: "Polar",
    description: "Polar AccessLink (OAuth2)",
    icon: Watch,
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
  },
  healthConnect: {
    name: "Health Connect",
    description: "Android Health Connect",
    icon: Smartphone,
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
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

const zoneBadgeClass: Record<number, string> = {
  1: "border-chart-2/30 text-chart-2",
  2: "border-chart-3/30 text-chart-3",
  3: "border-chart-5/30 text-chart-5",
  4: "border-rose-500/30 text-rose-400",
};

// ─── Component ───

export default function Devices() {
  const devices = useQuery(api.devices.list);
  const latestLactate = useQuery(api.devices.getLatestLactate);
  const connect = useMutation(api.devices.connect);
  const disconnect = useMutation(api.devices.disconnect);
  const syncNow = useMutation(api.devices.syncNow);
  const storeGarminCredentials = useMutation(api.devices.storeGarminCredentials);
  const storeAthyxApiKey = useMutation(api.devices.storeAthyxApiKey);
  const testGarminLogin = useAction(api.sync.garmin.testGarminLogin);
  const testAthyxKey = useAction(api.sync.athyx.testAthyxKey);

  // Garmin modal state
  const [garminModalOpen, setGarminModalOpen] = useState(false);
  const [garminEmail, setGarminEmail] = useState("");
  const [garminPassword, setGarminPassword] = useState("");
  const [garminConnecting, setGarminConnecting] = useState(false);

  // Athyx modal state
  const [athyxModalOpen, setAthyxModalOpen] = useState(false);
  const [athyxApiKey, setAthyxApiKey] = useState("");
  const [athyxConnecting, setAthyxConnecting] = useState(false);
  const [watchChecking, setWatchChecking] = useState(false);

  // Sync states
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  // Polar OAuth
  const POLAR_CLIENT_ID = "00000000-0000-0000-0000-000000000000"; // Placeholder — will be set via env
  const polarRedirectUri = `${window.location.origin}/oauth/polar/callback`;

  const athyxDevice = devices?.find((d) => d.type === "athyx");
  const athyxConnected = athyxDevice?.status === "connected";

  const getDeviceStatus = (type: OtherDeviceType) => {
    return devices?.find((d) => d.type === type);
  };

  const handleGarminConnect = useCallback(async () => {
    if (!garminEmail.trim() || !garminPassword.trim()) {
      toast.error("Введите email и пароль Garmin Connect");
      return;
    }
    setGarminConnecting(true);
    try {
      const testResult = await testGarminLogin({
        email: garminEmail.trim(),
        password: garminPassword,
      });

      if (!testResult.success) {
        toast.error(testResult.message || "Ошибка подключения к Garmin");
        return;
      }

      await storeGarminCredentials({
        email: garminEmail.trim(),
        password: garminPassword,
        sessionToken: testResult.sessionToken,
      });
      toast.success("Garmin подключён");
      setGarminModalOpen(false);
      setGarminPassword("");
      await syncNow({ type: "garmin" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка подключения Garmin");
    } finally {
      setGarminConnecting(false);
    }
  }, [garminEmail, garminPassword, storeGarminCredentials, syncNow, testGarminLogin]);

  const handleAthyxConnect = useCallback(async () => {
    if (!athyxApiKey.trim()) {
      toast.error("Введи API-ключ Athyx (ath_live_...)");
      return;
    }
    setAthyxConnecting(true);
    try {
      const testResult = await testAthyxKey({ apiKey: athyxApiKey.trim() });
      if (!testResult.success) {
        toast.error(testResult.message || "Ошибка подключения к Athyx");
        return;
      }

      await storeAthyxApiKey({ apiKey: athyxApiKey.trim() });
      toast.success("Athyx подключён");
      setAthyxModalOpen(false);
      setAthyxApiKey("");

      await syncNow({ type: "athyx" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка подключения Athyx");
    } finally {
      setAthyxConnecting(false);
    }
  }, [athyxApiKey, storeAthyxApiKey, syncNow, testAthyxKey]);

  const handlePolarConnect = useCallback(() => {
    const scope = encodeURIComponent(
      "training_sessions:read sleep:read nightly_recharge:read"
    );
    const redirectUri = encodeURIComponent(polarRedirectUri);
    const authUrl = `https://auth.polar.com/oauth/authorize?response_type=code&client_id=${POLAR_CLIENT_ID}&scope=${scope}&redirect_uri=${redirectUri}`;
    connect({ type: "polar" }).catch(() => {});
    window.location.href = authUrl;
  }, [connect, polarRedirectUri, POLAR_CLIENT_ID]);

  const handleCheckWatch = useCallback(async () => {
    setWatchChecking(true);
    try {
      const res = await GarminBridge.isWatchAvailable();
      if (res.available) {
        toast.success("Часы Garmin на связи ✅");
      } else {
        toast.info("Часы не найдены — держи телефон рядом с часами");
      }
    } finally {
      setWatchChecking(false);
    }
  }, []);

  const handleSync = useCallback(
    async (type: OtherDeviceType | "athyx") => {
      setSyncing((prev) => ({ ...prev, [type]: true }));
      try {
        await syncNow({ type });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Ошибка синхронизации");
      } finally {
        setSyncing((prev) => ({ ...prev, [type]: false }));
      }
    },
    [syncNow]
  );

  const handleDisconnect = useCallback(
    async (type: OtherDeviceType | "athyx") => {
      try {
        await disconnect({ type });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Ошибка отключения");
      }
    },
    [disconnect]
  );

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Athyx — front and center */}
      <motion.div initial="hidden" animate="show" variants={container}>
        <motion.div variants={item}>
          <Card className="glass border-0 overflow-hidden ring-1 ring-rose-400/20">
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-400/10 flex items-center justify-center">
                <Droplet className="h-7 w-7 text-rose-400" />
              </div>

              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Athyx FLUX I</h2>
                <Badge
                  variant="outline"
                  className={`text-xs ${athyxConnected ? "border-chart-2/30 text-chart-2" : ""}`}
                >
                  {statusIcon(athyxDevice?.status)}
                  <span className="ml-1">{statusLabel(athyxDevice?.status)}</span>
                </Badge>
              </div>

              {athyxConnected && latestLactate && (
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${zoneBadgeClass[lactateZone(latestLactate.lactateMM)]}`}
                  >
                    🩸 {latestLactate.lactateMM.toFixed(1)} ммоль/л
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {latestLactate.ageSeconds < 60
                      ? `${latestLactate.ageSeconds} сек назад`
                      : `${Math.round(latestLactate.ageSeconds / 60)} мин назад`}
                  </span>
                </div>
              )}

              {athyxConnected ? (
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <Button variant="outline" size="sm" onClick={handleCheckWatch} disabled={watchChecking}>
                    {watchChecking ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Watch className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Часы
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleSync("athyx")} disabled={syncing.athyx}>
                    {syncing.athyx ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Синхр.
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDisconnect("athyx")}>
                    <Unplug className="mr-1.5 h-3.5 w-3.5" />
                    Откл.
                  </Button>
                </div>
              ) : (
                <Button size="lg" onClick={() => setAthyxModalOpen(true)} className="glass-highlight">
                  <Link2 className="mr-2 h-4 w-4" />
                  Привязать Athyx
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Other devices — compact, secondary */}
        <div className="space-y-2 mt-4">
          {(Object.entries(otherDeviceInfo) as [OtherDeviceType, DeviceMeta][]).map(([type, info]) => {
            const device = getDeviceStatus(type);
            const isConnected = device?.status === "connected";
            const isSyncing = syncing[type];

            return (
              <motion.div key={type} variants={item}>
                <Card className="glass border-0">
                  <CardContent className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg ${info.bgColor} flex items-center justify-center shrink-0`}>
                        <info.icon className={`h-4.5 w-4.5 ${info.color}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{info.name}</span>
                          {isConnected && (
                            <Badge variant="outline" className="text-[10px] border-chart-2/30 text-chart-2">
                              Подключено
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{info.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isConnected ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleSync(type)} disabled={isSyncing}>
                            {isSyncing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDisconnect(type)}>
                            <Unplug className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (type === "garmin") setGarminModalOpen(true);
                            else if (type === "polar") handlePolarConnect();
                            else if (type === "healthConnect") connect({ type: "healthConnect" });
                          }}
                        >
                          Подключить
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Garmin Credentials Modal */}
      <Dialog open={garminModalOpen} onOpenChange={setGarminModalOpen}>
        <DialogContent className="glass border-0 max-w-sm">
          <DialogHeader>
            <DialogTitle>Подключение Garmin Connect</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Email и пароль от Garmin Connect.
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
              <Input
                id="garmin-password"
                type="password"
                placeholder="Пароль Garmin Connect"
                value={garminPassword}
                onChange={(e) => setGarminPassword(e.target.value)}
                autoComplete="current-password"
                className="glass border-white/10"
              />
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
              <Button size="sm" onClick={handleGarminConnect} disabled={garminConnecting} className="glass-highlight">
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

      {/* Athyx API Key Modal */}
      <Dialog open={athyxModalOpen} onOpenChange={setAthyxModalOpen}>
        <DialogContent className="glass border-0 max-w-sm">
          <DialogHeader>
            <DialogTitle>Привязать Athyx</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ключ с{" "}
              <a
                href="https://www.athyx.com/developers"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                athyx.com/developers
              </a>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="athyx-key"
                  type="text"
                  placeholder="ath_live_..."
                  value={athyxApiKey}
                  onChange={(e) => setAthyxApiKey(e.target.value)}
                  autoComplete="off"
                  className="glass border-white/10 pl-9 font-mono text-xs"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAthyxModalOpen(false);
                  setAthyxApiKey("");
                }}
              >
                Отмена
              </Button>
              <Button size="sm" onClick={handleAthyxConnect} disabled={athyxConnecting} className="glass-highlight">
                {athyxConnecting ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-1.5 h-4 w-4" />
                )}
                {athyxConnecting ? "Подключение..." : "Привязать"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
