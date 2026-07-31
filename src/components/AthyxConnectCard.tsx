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
import { useState, useCallback, useEffect, useRef } from "react";
import {
  Watch,
  RefreshCw,
  Unplug,
  Link2,
  CheckCircle2,
  XCircle,
  Loader2,
  Droplet,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import { GarminBridge } from "@/lib/garmin-bridge";
import { lactateZone } from "@/hooks/use-garmin-lactate-bridge";

const STORAGE_KEY = "athyx_api_key";
const POLL_INTERVAL_MS = 60_000;
// Athyx returned 429 (rate limited) and gave no Retry-After — back off with
// growing delays instead of retrying at a fixed interval that just draws
// another 429 every time.
const RATE_LIMIT_BASE_BACKOFF_MS = 60_000;
const RATE_LIMIT_MAX_BACKOFF_MS = 15 * 60_000;

const zoneBadgeClass: Record<number, string> = {
  1: "border-chart-2/30 text-chart-2",
  2: "border-chart-3/30 text-chart-3",
  3: "border-chart-5/30 text-chart-5",
  4: "border-rose-500/30 text-rose-400",
};

type LatestLactate = {
  lactateMM: number;
  peakLactateMM?: number;
  timestamp: number;
};

function errorMessage(error?: string): string {
  if (error === "invalid_key") return "Athyx отклонил ключ — проверь, что он скопирован полностью";
  if (error?.startsWith("http_")) return `Athyx: сервер ответил ${error.slice(5)}`;
  if (!error) return "Не удалось связаться с Athyx";
  return `Athyx: ${error}`;
}

// Athyx FLUX I connect/status card — the one and only thing a user needs
// to bind their lactate sensor. Talks to Athyx and the Garmin watch
// entirely through the native GarminBridge plugin: the API key lives only
// on this device (localStorage), and every ~30s a fresh reading is fetched
// and relayed to the watch. No backend, no account, nothing to deploy.
export function AthyxConnectCard() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [latest, setLatest] = useState<LatestLactate | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [watchChecking, setWatchChecking] = useState(false);

  const apiKeyRef = useRef<string | null>(null);
  apiKeyRef.current = apiKey;
  const backoffUntilRef = useRef(0);
  const consecutive429Ref = useRef(0);

  useEffect(() => {
    setApiKey(localStorage.getItem(STORAGE_KEY));
  }, []);

  const syncOnce = useCallback(async (key: string, { silent }: { silent: boolean }) => {
    if (Date.now() < backoffUntilRef.current) {
      if (!silent) {
        const waitSec = Math.ceil((backoffUntilRef.current - Date.now()) / 1000);
        toast.info(`Athyx ограничивает частоту запросов — подожди ${waitSec} сек`);
      }
      return false;
    }
    const res = await GarminBridge.fetchAthyxLatest({ apiKey: key });
    if (!res.success) {
      if (res.error === "http_429") {
        if (res.retryAfterSec !== undefined) {
          // The server told us exactly how long — trust that over any guess.
          backoffUntilRef.current = Date.now() + res.retryAfterSec * 1000;
          consecutive429Ref.current = 0;
        } else {
          const backoffMs = Math.min(
            RATE_LIMIT_BASE_BACKOFF_MS * Math.pow(2, consecutive429Ref.current),
            RATE_LIMIT_MAX_BACKOFF_MS
          );
          backoffUntilRef.current = Date.now() + backoffMs;
          consecutive429Ref.current += 1;
        }
      }
      if (!silent) toast.error(errorMessage(res.error));
      return false;
    }
    consecutive429Ref.current = 0;
    if (res.hasReading && res.lactateMM !== undefined) {
      const timestamp = res.startedAt ? new Date(res.startedAt).getTime() : Date.now();
      const reading: LatestLactate = {
        lactateMM: res.lactateMM,
        peakLactateMM: res.peakLactateMM,
        timestamp,
      };
      setLatest(reading);
      await GarminBridge.sendLactate({
        lactateMM: reading.lactateMM,
        zone: lactateZone(reading.lactateMM),
        ageSeconds: Math.round((Date.now() - timestamp) / 1000),
        timestamp,
      });
    } else if (!silent) {
      toast.info("Athyx подключён — сессий пока нет");
    }
    return true;
  }, []);

  // Poll every 30s while a key is set, relaying each fresh reading to the watch.
  useEffect(() => {
    if (!apiKey) return;
    const tick = () => {
      if (apiKeyRef.current) syncOnce(apiKeyRef.current, { silent: true });
    };
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [apiKey, syncOnce]);

  const handleConnect = useCallback(async () => {
    const key = inputValue.trim();
    if (!key) {
      toast.error("Введи API-ключ Athyx (ath_live_...)");
      return;
    }
    setConnecting(true);
    try {
      const res = await GarminBridge.fetchAthyxLatest({ apiKey: key });
      if (!res.success) {
        if (res.error === "http_429") {
          const backoffMs = res.retryAfterSec !== undefined ? res.retryAfterSec * 1000 : RATE_LIMIT_BASE_BACKOFF_MS;
          backoffUntilRef.current = Date.now() + backoffMs;
        }
        toast.error(errorMessage(res.error));
        return;
      }
      localStorage.setItem(STORAGE_KEY, key);
      setApiKey(key);
      toast.success("Athyx подключён");
      setModalOpen(false);
      setInputValue("");
      // Reuse this response instead of firing a second request right away.
      if (res.hasReading && res.lactateMM !== undefined) {
        const timestamp = res.startedAt ? new Date(res.startedAt).getTime() : Date.now();
        setLatest({ lactateMM: res.lactateMM, peakLactateMM: res.peakLactateMM, timestamp });
        await GarminBridge.sendLactate({
          lactateMM: res.lactateMM,
          zone: lactateZone(res.lactateMM),
          ageSeconds: Math.round((Date.now() - timestamp) / 1000),
          timestamp,
        });
      }
    } finally {
      setConnecting(false);
    }
  }, [inputValue]);

  const handleSync = useCallback(async () => {
    if (!apiKey) return;
    setSyncing(true);
    try {
      await syncOnce(apiKey, { silent: false });
    } finally {
      setSyncing(false);
    }
  }, [apiKey, syncOnce]);

  const handleDisconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey(null);
    setLatest(null);
  }, []);

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

  const connected = apiKey !== null;
  const ageSeconds = latest ? Math.round((Date.now() - latest.timestamp) / 1000) : null;

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
              {connected ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="ml-1">{connected ? "Подключено" : "Не подключено"}</span>
            </Badge>
          </div>

          {connected && latest && (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-xs ${zoneBadgeClass[lactateZone(latest.lactateMM)]}`}
              >
                🩸 {latest.lactateMM.toFixed(1)} ммоль/л
              </Badge>
              {ageSeconds !== null && (
                <span className="text-[10px] text-muted-foreground">
                  {ageSeconds < 60 ? `${ageSeconds} сек назад` : `${Math.round(ageSeconds / 60)} мин назад`}
                </span>
              )}
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
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
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
                  setInputValue("");
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
