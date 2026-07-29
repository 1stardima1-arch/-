import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { GarminBridge } from "@/lib/garmin-bridge";

// Simplified lactate training zones (mmol/L) used only to color-code the
// watch display. Not a substitute for a real physiological threshold test.
export function lactateZone(mM: number): number {
  if (mM < 2) return 1; // aerobic / easy
  if (mM < 4) return 2; // steady / tempo
  if (mM < 6) return 3; // threshold
  return 4; // anaerobic / VO2
}

// Watches the latest Athyx lactate reading (polled server-side every ~30s,
// see convex/crons.ts) and relays it to the paired Garmin watch app whenever
// it changes. Mount this once near the app root so it stays active across
// pages while a device is connected.
export function useGarminLactateBridge() {
  const latest = useQuery(api.devices.getLatestLactate);
  const lastSentTimestamp = useRef<number | null>(null);

  useEffect(() => {
    if (!latest) return;
    if (lastSentTimestamp.current === latest.timestamp) return;
    lastSentTimestamp.current = latest.timestamp;

    GarminBridge.sendLactate({
      lactateMM: latest.lactateMM,
      zone: lactateZone(latest.lactateMM),
      ageSeconds: latest.ageSeconds,
      timestamp: latest.timestamp,
    }).catch(() => {
      // Watch not paired / Connect IQ app not installed — safe to ignore,
      // the Devices page surfaces connection state to the user.
    });
  }, [latest]);
}
