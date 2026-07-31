import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

// Athyx FLUX I connect/status card — the one and only thing a user needs
// to bind their lactate sensor. Reused as the app's entry screen and as
// the top card on the fuller Devices settings page.
export function AthyxConnectCard() {
  const devices = useQuery(api.devices.list);
  const latestLactate = useQuery(api.devices.getLatestLactate);
  const syncNow = useMutation(api.devices.syncNow);
  const disconnect = useMutation(api.devices.disconnect);
  const storeAthyxApiKey = useMutation(api.devices.storeAthyxApiKey);
  const testAthyxKey = useAction(api.sync.athyx.testAthyxKey);

  const [modalOpen, setModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [watchChecking, setWatchChecking] = useState(false);

  const device = devices?.find((d) => d.type === "athyx");
  const connected = device?.status === "connected";

  const handleConnect = useCallback(async () => {
    if (!apiKey.trim()) {
      toast.error("Введи API-ключ Athyx (ath_live_...)");
      return;
    }
    setConnecting(true);
    try {
      const testResult = await testAthyxKey({ apiKey: apiKey.trim() });
      if (!testResult.success) {
        toast.error(testResult.message || "Ошибка подключения к Athyx");
        return;
      }

      await storeAthyxApiKey({ apiKey: apiKey.trim() });
      toast.success("Athyx подключён");
      setModalOpen(false);
      setApiKey("");

      await syncNow({ type: "athyx" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка подключения Athyx");
    } finally {
      setConnecting(false);
    }
  }, [apiKey, storeAthyxApiKey, syncNow, testAthyxKey]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncNow({ type: "athyx" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка синхронизации");
    } finally {
      setSyncing(false);
    }
  }, [syncNow]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect({ type: "athyx" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка отключения");
    }
  }, [disconnect]);

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

  return (
    <>
      <Card className="glass border-0 overflow-hidden ring-1 ring-rose-400/20">
        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-400/10 flex items-center justify-center">
            <Droplet className="h-7 w-7 text-rose-400" />
          </div>

          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Athyx FLUX I</h2>
            <Badge
              variant="outline"
              className={`text-xs ${connected ? "border-chart-2/30 text-chart-2" : ""}`}
            >
              {statusIcon(device?.status)}
              <span className="ml-1">{statusLabel(device?.status)}</span>
            </Badge>
          </div>

          {connected && latestLactate && (
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

          {connected ? (
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Button variant="outline" size="sm" onClick={handleCheckWatch} disabled={watchChecking}>
                {watchChecking ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Watch className="mr-1.5 h-3.5 w-3.5" />
                )}
                Часы
              </Button>
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                {syncing ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                )}
                Синхр.
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDisconnect}>
                <Unplug className="mr-1.5 h-3.5 w-3.5" />
                Откл.
              </Button>
            </div>
          ) : (
            <Button size="lg" onClick={() => setModalOpen(true)} className="glass-highlight">
              <Link2 className="mr-2 h-4 w-4" />
              Привязать Athyx
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
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
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="ath_live_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
                className="glass border-white/10 pl-9 font-mono text-xs"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setModalOpen(false);
                  setApiKey("");
                }}
              >
                Отмена
              </Button>
              <Button size="sm" onClick={handleConnect} disabled={connecting} className="glass-highlight">
                {connecting ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-1.5 h-4 w-4" />
                )}
                {connecting ? "Подключение..." : "Привязать"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
