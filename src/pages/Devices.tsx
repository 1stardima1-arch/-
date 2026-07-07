import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Watch,
  RefreshCw,
  Unplug,
  Link2,
  ExternalLink,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";

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
    description: "Garmin Connect (официальная интеграция)",
    icon: Watch,
    color: "text-chart-1",
    bgColor: "bg-chart-1/10",
    available: false,
    unavailableReason: "Программа Garmin Connect Developer временно не принимает новые заявки.",
  },
  polar: {
    name: "Polar",
    description: "Polar AccessLink (доступна регистрация)",
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

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

export default function Devices() {
  const devices = useQuery(api.devices.list);
  const connectDevice = useMutation(api.devices.connect);
  const disconnectDevice = useMutation(api.devices.disconnect);
  const syncNow = useMutation(api.devices.syncNow);

  const getDeviceStatus = (type: "garmin" | "polar" | "healthConnect") => {
    return devices?.find((d) => d.type === type);
  };

  const handleConnect = async (type: "garmin" | "polar" | "healthConnect") => {
    const info = deviceInfo[type];
    if (!info.available) return;

    if (type === "polar" && info.setupUrl) {
      // Open Polar OAuth in new window
      window.open(info.setupUrl, "_blank");
    }

    await connectDevice({ type });
  };

  const handleDisconnect = async (type: "garmin" | "polar" | "healthConnect") => {
    await disconnectDevice({ type });
  };

  const handleSync = async (type: "garmin" | "polar" | "healthConnect") => {
    await syncNow({ type });
  };

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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Устройства</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Подключённые устройства и синхронизация
        </p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {(Object.entries(deviceInfo) as ["garmin" | "polar" | "healthConnect", DeviceMeta][]).map(
          ([type, info]) => {
            const device = getDeviceStatus(type);
            const isConnected = device?.status === "connected";

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
                                isConnected ? "border-chart-2/30 text-chart-2" : ""
                              }`}
                            >
                              {statusIcon(device?.status)}
                              <span className="ml-1">{statusLabel(device?.status)}</span>
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {info.description}
                          </p>
                          {!info.available && (
                            <p className="text-xs text-chart-5 mt-1.5 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {info.unavailableReason}
                            </p>
                          )}
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
                            >
                              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                              Синхр.
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
                            onClick={() => handleConnect(type)}
                            disabled={!info.available}
                            className={
                              !info.available ? "opacity-50" : "glass-highlight"
                            }
                          >
                            {info.available ? (
                              <>
                                <Link2 className="mr-1.5 h-3.5 w-3.5" />
                                Подключить
                              </>
                            ) : (
                              <>
                                <Clock className="mr-1.5 h-3.5 w-3.5" />
                                Ожидание
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          }
        )}
      </motion.div>

      {/* How it works */}
      <Card className="glass border-0">
        <CardHeader>
          <CardTitle className="text-base">Как работает синхронизация</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">Polar:</strong> Поддерживается через
            OAuth-поток. Нажми «Подключить» — откроется страница Polar AccessLink.
            После авторизации данные тренировок, сна и HRV будут автоматически поступать в приложение.
          </p>
          <p>
            <strong className="text-foreground">Garmin:</strong> Официальная программа
            Garmin Connect Developer временно приостановила приём новых заявок. Как
            только регистрация возобновится — интеграция будет добавлена.
          </p>
          <p>
            <strong className="text-foreground">Обходной путь через Health Connect:</strong>{" "}
            Установи Android-приложение AI Coach, настрой Health Connect для чтения
            данных Garmin Connect — тренировки появятся на дашборде без прямого API.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
