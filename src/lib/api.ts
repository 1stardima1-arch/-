// API service layer for external Cloudflare Worker backend
// URL is configurable via VITE_API_BASE_URL env var
// Falls back to Convex when external API is unavailable

const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(
  endpoint: string,
  opts: RequestOptions = {}
): Promise<T | null> {
  if (!API_BASE) {
    console.warn("No API_BASE_URL configured, using Convex only");
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: opts.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...opts.headers,
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });

    if (!res.ok) {
      console.error(`API error ${res.status}: ${endpoint}`);
      return null;
    }

    return (await res.json()) as T;
  } catch (e) {
    console.error("API request failed:", e);
    return null;
  }
}

// Athlete profile
export const athleteApi = {
  getProfile: (userId: string) =>
    request<AthleteProfile>(`/api/user/${userId}/profile`),
  updateProfile: (userId: string, data: Partial<AthleteProfile>) =>
    request<AthleteProfile>(`/api/user/${userId}/profile`, {
      method: "PUT",
      body: data,
    }),
};

// Daily metrics
export const metricsApi = {
  getToday: (userId: string) =>
    request<DailyMetrics>(`/api/user/${userId}/metrics/today`),
  getRange: (userId: string) =>
    request<DailyMetrics[]>(`/api/user/${userId}/metrics`),
  addMetrics: (userId: string, data: Partial<DailyMetrics>) =>
    request(`/api/user/${userId}/metrics`, {
      method: "POST",
      body: data,
    }),
};

// Activities
export const activitiesApi = {
  list: (userId: string) =>
    request<TrainingActivity[]>(`/api/user/${userId}/activities`),
  add: (userId: string, data: Partial<TrainingActivity>) =>
    request(`/api/user/${userId}/activities`, {
      method: "POST",
      body: data,
    }),
};

// Performance
export const performanceApi = {
  get: (userId: string) =>
    request<PerformanceData[]>(`/api/user/${userId}/performance`),
};

// Devices
export const devicesApi = {
  list: (userId: string) =>
    request<DeviceInfo[]>(`/api/user/${userId}/devices`),
  connect: (userId: string, type: string, data?: unknown) =>
    request(`/api/user/${userId}/devices`, {
      method: "POST",
      body: { type, ...(data as object) },
    }),
  disconnect: (userId: string, type: string) =>
    request(`/api/user/${userId}/devices/disconnect`, {
      method: "POST",
      body: { type },
    }),
  sync: (userId: string) =>
    request(`/api/user/${userId}/sync`, { method: "POST" }),
};

// OAuth URLs
export const oauthApi = {
  getGarminUrl: () => request<{ url: string }>("/api/oauth/garmin/url"),
  getPolarUrl: () => request<{ url: string }>("/api/oauth/polar/url"),
};

// Journal
export const journalApi = {
  get: (userId: string) =>
    request<JournalEntry[]>(`/api/user/${userId}/journal`),
  log: (userId: string, data: Partial<JournalEntry>) =>
    request(`/api/user/${userId}/journal`, { method: "POST", body: data }),
};

// Nutrition
export const nutritionApi = {
  getToday: (userId: string) =>
    request(`/api/user/${userId}/nutrition/today`),
  logMeal: (
    userId: string,
    data: { date: string; mealType: string; foods: FoodItem[] }
  ) =>
    request(`/api/user/${userId}/nutrition/log`, {
      method: "POST",
      body: data,
    }),
  getTargets: (userId: string) =>
    request(`/api/user/${userId}/nutrition/targets`),
};

// Events
export const eventsApi = {
  list: (userId: string) => request(`/api/user/${userId}/events`),
  add: (userId: string, data: Partial<RaceEvent>) =>
    request(`/api/user/${userId}/events`, { method: "POST", body: data }),
  update: (userId: string, eventId: string, data: Partial<RaceEvent>) =>
    request(`/api/user/${userId}/events/${eventId}`, {
      method: "PUT",
      body: data,
    }),
  remove: (userId: string, eventId: string) =>
    request(`/api/user/${userId}/events/${eventId}`, { method: "DELETE" }),
};

// ─── Type interfaces matching Cloudflare Worker data ───

export interface AthleteProfile {
  gender: "male" | "female" | "other";
  age: number;
  height: number;
  weight: number;
  sports: string[];
  level: string;
  experienceYears: number;
  maxHR?: number;
  restingHR?: number;
  ftp?: number;
  thresholdPace?: number;
  injuries: { zone: string; type: string; limitation: string }[];
  chronicConditions?: string;
  targetEvent?: {
    name: string;
    date: string;
    targetTime?: string;
    discipline: string;
  };
  weeklyVolumeHours: number;
}

export interface DailyMetrics {
  date: string;
  hrv?: number;
  restingHR?: number;
  sleepStages?: { deep: number; light: number; rem: number; awake: number };
  sleepDuration?: number;
  sleepEfficiency?: number;
  bodyBattery?: number;
  trainingStatus?: string;
  recoveryScore?: number;
  stressLevel?: number;
}

export interface TrainingActivity {
  id: string;
  date: string;
  sport: string;
  distance?: number;
  duration: number;
  pace?: number;
  avgHR?: number;
  maxHR?: number;
  hrZones?: { zone: number; minBpm: number; maxBpm: number; timeSeconds: number }[];
  tss?: number;
  notes?: string;
  planned: boolean;
  title?: string;
}

export interface PerformanceData {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  tss?: number;
}

export interface DeviceInfo {
  type: "garmin" | "polar" | "healthConnect";
  status: "connected" | "disconnected" | "unavailable";
  connectedAt?: number;
  lastSync?: number;
}

export interface JournalEntry {
  date: string;
  alcohol?: boolean;
  caffeine?: boolean;
  stress?: number;
  screenBeforeSleep?: number;
  notes?: string;
  sleepQuality?: number;
  mood?: number;
  soreness?: number;
}

export interface FoodItem {
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  amount?: string;
}

export interface RaceEvent {
  id?: string;
  name: string;
  date: string;
  discipline: string;
  targetTime?: string;
  priority: "A" | "B" | "C";
  location?: string;
  notes?: string;
  result?: { time: string; pace?: number; notes?: string };
  completed: boolean;
}
