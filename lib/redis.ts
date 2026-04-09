import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

export const redis = Redis.fromEnv();

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "60s"),
  analytics: true,
  prefix: "csv-analyst:rl",
});
