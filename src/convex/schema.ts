import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

export const sportValidator = v.union(
  v.literal("running"),
  v.literal("cycling"),
  v.literal("swimming"),
  v.literal("skiing"),
  v.literal("triathlon"),
  v.literal("other"),
);
export type Sport = Infer<typeof sportValidator>;

export const levelValidator = v.union(
  v.literal("beginner"),
  v.literal("amateur"),
  v.literal("semipro"),
  v.literal("pro"),
);
export type Level = Infer<typeof levelValidator>;

export const injuryValidator = v.object({
  zone: v.string(),
  type: v.string(),
  limitation: v.string(),
});

export const hrZoneValidator = v.object({
  zone: v.number(),
  minBpm: v.number(),
  maxBpm: v.number(),
  timeSeconds: v.number(),
});

export const sleepStagesValidator = v.object({
  deep: v.number(),
  light: v.number(),
  rem: v.number(),
  awake: v.number(),
});

export const eventPriorityValidator = v.union(
  v.literal("A"),
  v.literal("B"),
  v.literal("C"),
);

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
      onboardingCompleted: v.optional(v.boolean()),
    }).index("email", ["email"]),

    // Athlete profile
    athleteProfiles: defineTable({
      userId: v.id("users"),
      gender: v.union(v.literal("male"), v.literal("female"), v.literal("other")),
      age: v.number(),
      height: v.number(),
      weight: v.number(),
      sports: v.array(sportValidator),
      level: levelValidator,
      experienceYears: v.number(),
      maxHR: v.optional(v.number()),
      restingHR: v.optional(v.number()),
      ftp: v.optional(v.number()),
      thresholdPace: v.optional(v.number()),
      injuries: v.array(injuryValidator),
      chronicConditions: v.optional(v.string()),
      targetEvent: v.optional(v.object({
        name: v.string(),
        date: v.string(),
        targetTime: v.optional(v.string()),
        discipline: v.string(),
      })),
      weeklyVolumeHours: v.number(),
    }).index("by_user", ["userId"]),

    // Daily metrics (HRV, sleep, body battery, etc.)
    dailyMetrics: defineTable({
      userId: v.id("users"),
      date: v.string(),
      hrv: v.optional(v.number()),
      restingHR: v.optional(v.number()),
      sleepStages: v.optional(sleepStagesValidator),
      sleepDuration: v.optional(v.number()),
      sleepEfficiency: v.optional(v.number()),
      bodyBattery: v.optional(v.number()),
      trainingStatus: v.optional(v.string()),
      recoveryScore: v.optional(v.number()),
      stressLevel: v.optional(v.number()),
    }).index("by_user_date", ["userId", "date"]),

    // Performance data (CTL/ATL/TSB for PMC chart)
    performanceData: defineTable({
      userId: v.id("users"),
      date: v.string(),
      ctl: v.number(),
      atl: v.number(),
      tsb: v.number(),
      tss: v.optional(v.number()),
    }).index("by_user_date", ["userId", "date"]),

    // Training activities
    trainingActivities: defineTable({
      userId: v.id("users"),
      date: v.string(),
      sport: sportValidator,
      distance: v.optional(v.number()),
      duration: v.number(),
      pace: v.optional(v.number()),
      avgHR: v.optional(v.number()),
      maxHR: v.optional(v.number()),
      hrZones: v.optional(v.array(hrZoneValidator)),
      tss: v.optional(v.number()),
      notes: v.optional(v.string()),
      planned: v.boolean(),
      title: v.optional(v.string()),
      elevation: v.optional(v.number()),
      calories: v.optional(v.number()),
    }).index("by_user_date", ["userId", "date"])
      .index("by_user_sport", ["userId", "sport"]),

    // Connected devices
    devices: defineTable({
      userId: v.id("users"),
      type: v.union(v.literal("garmin"), v.literal("polar"), v.literal("healthConnect")),
      status: v.union(v.literal("connected"), v.literal("disconnected"), v.literal("unavailable")),
      connectedAt: v.optional(v.number()),
      lastSync: v.optional(v.number()),
      tokenData: v.optional(v.string()),
    }).index("by_user_type", ["userId", "type"]),

    // Wellness journal
    journalEntries: defineTable({
      userId: v.id("users"),
      date: v.string(),
      alcohol: v.optional(v.boolean()),
      caffeine: v.optional(v.boolean()),
      stress: v.optional(v.number()),
      screenBeforeSleep: v.optional(v.number()),
      notes: v.optional(v.string()),
      sleepQuality: v.optional(v.number()),
      mood: v.optional(v.number()),
      soreness: v.optional(v.number()),
    }).index("by_user_date", ["userId", "date"]),

    // Nutrition log
    nutritionLog: defineTable({
      userId: v.id("users"),
      date: v.string(),
      mealType: v.union(v.literal("breakfast"), v.literal("lunch"), v.literal("dinner"), v.literal("snack"), v.literal("preWorkout"), v.literal("postWorkout")),
      foods: v.array(v.object({
        name: v.string(),
        calories: v.optional(v.number()),
        protein: v.optional(v.number()),
        carbs: v.optional(v.number()),
        fat: v.optional(v.number()),
        amount: v.optional(v.string()),
      })),
      totalCalories: v.optional(v.number()),
      totalProtein: v.optional(v.number()),
      totalCarbs: v.optional(v.number()),
      totalFat: v.optional(v.number()),
      notes: v.optional(v.string()),
    }).index("by_user_date", ["userId", "date"]),

    // Nutrition daily targets
    nutritionTargets: defineTable({
      userId: v.id("users"),
      date: v.string(),
      calories: v.number(),
      protein: v.number(),
      carbs: v.number(),
      fat: v.number(),
      waterMl: v.optional(v.number()),
    }).index("by_user_date", ["userId", "date"]),

    // Events / races
    events: defineTable({
      userId: v.id("users"),
      name: v.string(),
      date: v.string(),
      discipline: v.string(),
      targetTime: v.optional(v.string()),
      priority: eventPriorityValidator,
      location: v.optional(v.string()),
      notes: v.optional(v.string()),
      result: v.optional(v.object({
        time: v.string(),
        pace: v.optional(v.number()),
        notes: v.optional(v.string()),
      })),
      completed: v.boolean(),
    }).index("by_user_date", ["userId", "date"])
      .index("by_user_priority", ["userId", "priority"]),
    // Analytics events for admin dashboard
    analyticsEvents: defineTable({
      userId: v.optional(v.id("users")),
      event: v.string(),
      properties: v.optional(v.string()),
      path: v.optional(v.string()),
      timestamp: v.number(),
    }).index("by_event", ["event"])
      .index("by_timestamp", ["timestamp"])
      .index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
