/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as aiCoach from "../aiCoach.js";
import type * as analytics from "../analytics.js";
import type * as athletes from "../athletes.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as crons from "../crons.js";
import type * as devices from "../devices.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as journal from "../journal.js";
import type * as metrics from "../metrics.js";
import type * as nutrition from "../nutrition.js";
import type * as performance from "../performance.js";
import type * as sync_athyx from "../sync/athyx.js";
import type * as sync_garmin from "../sync/garmin.js";
import type * as sync_helpers from "../sync/helpers.js";
import type * as sync_polar from "../sync/polar.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  aiCoach: typeof aiCoach;
  analytics: typeof analytics;
  athletes: typeof athletes;
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  crons: typeof crons;
  devices: typeof devices;
  events: typeof events;
  http: typeof http;
  journal: typeof journal;
  metrics: typeof metrics;
  nutrition: typeof nutrition;
  performance: typeof performance;
  "sync/athyx": typeof sync_athyx;
  "sync/garmin": typeof sync_garmin;
  "sync/helpers": typeof sync_helpers;
  "sync/polar": typeof sync_polar;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
