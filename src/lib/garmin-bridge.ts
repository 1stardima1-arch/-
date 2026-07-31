import { registerPlugin } from "@capacitor/core";

export interface LactatePayload {
  lactateMM: number;
  zone: number;
  ageSeconds: number;
  timestamp: number;
}

export interface AthyxLatestResult {
  success: boolean;
  hasReading?: boolean;
  lactateMM?: number;
  peakLactateMM?: number;
  avgHR?: number;
  startedAt?: string;
  error?: string;
  // Present when error is "http_429" and the server sent a plain-integer
  // Retry-After header — the authoritative wait time, if given.
  retryAfterSec?: number;
}

export interface GarminBridgePlugin {
  // Sends the current lactate reading to the paired Connect IQ watch app.
  // Resolves once the message has been handed to the Connect IQ Mobile SDK —
  // this does NOT guarantee delivery to the watch (Bluetooth range, app not
  // open, etc).
  sendLactate(payload: LactatePayload): Promise<{ sent: boolean; error?: string }>;
  // Whether a Connect IQ-capable Garmin device is currently paired and reachable.
  isWatchAvailable(): Promise<{ available: boolean }>;
  // Fetches the most recent Athyx session (native HTTP call — no CORS risk).
  fetchAthyxLatest(payload: { apiKey: string }): Promise<AthyxLatestResult>;
}

// On web/dev builds (no native plugin registered) calls resolve to safe
// no-ops instead of throwing, so the rest of the app doesn't need to guard
// every call with a platform check.
export const GarminBridge = registerPlugin<GarminBridgePlugin>("GarminBridge", {
  web: () => ({
    async sendLactate() {
      return { sent: false, error: "GarminBridge is only available on Android" };
    },
    async isWatchAvailable() {
      return { available: false };
    },
    async fetchAthyxLatest() {
      return { success: false, error: "GarminBridge is only available on Android" };
    },
  }),
});
