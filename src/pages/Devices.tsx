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
import { Watch, RefreshCw, Unplug, Smartphone, Loader2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { AthyxConnectCard } from "@/components/AthyxConnectCard";

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

// ─── Component ───

export default function Devices() {
  const devices = useQuery(api.devices.list);
  const connect = useMutation(api.devices.connect);
  const disconnect = useMutation(api.devices.disconnect);
  const syncNow = useMutation(api.devices.syncNow);
  const storeGarminCredentials = useMutation(api.devices.storeGarminCredentials);
  const testGarminLogin = useAction(api.sync.garmin.testGarminLogin);

  // Garmin modal state
  const [garminModalOpen, setGarminModalOpen] = useState(false);
  const [garminEmail, setGarminEmail] = useState("");
  const [garminPassword, setGarminPassword] = useState("");
  const [garminConnecting, setGarminConnecting] = useState(false);

  // Sync states
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  // Polar OAuth
  const POLAR_CLIENT_ID = "00000000-0000-0000-0000-000000000000"; // Placeholder — will be set via env
  const polarRedirectUri = `${window.location.origin}/oauth/polar/callback`;

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

  const handlePolarConnect = useCallback(() => {
    const scope = encodeURIComponent(
      "training_sessions:read sleep:read nightly_recharge:read"
    );
    const redirectUri = encodeURIComponent(polarRedirectUri);
    const authUrl = `https://auth.polar.com/oauth/authorize?response_type=code&client_id=${POLAR_CLIENT_ID}&scope=${scope}&redirect_uri=${redirectUri}`;
    connect({ type: "polar" }).catch(() => {});
    window.location.href = authUrl;
  }, [connect, polarRedirectUri, POLAR_CLIENT_ID]);

  const handleSync = useCallback(
    async (type: OtherDeviceType) => {
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
    async (type: OtherDeviceType) => {
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
      <motion.div initial="hidden" animate="show" variants={container}>
        <motion.div variants={item}>
          <AthyxConnectCard />
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
    </div>
  );
}
