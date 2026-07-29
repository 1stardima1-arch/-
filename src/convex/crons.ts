import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Poll Athyx for the latest lactate reading for every connected user.
// The Athyx API only exposes completed/rolling session data (no push/stream),
// so this is a poll, not a live feed — 30s keeps the watch reasonably fresh
// without hammering the API.
crons.interval(
  "sync athyx lactate",
  { seconds: 30 },
  internal.sync.athyx.syncAllAthyx,
  {},
);

export default crons;
