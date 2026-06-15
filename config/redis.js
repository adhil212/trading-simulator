import { Redis } from "@upstash/redis";

let redis = null;

function getRedis() {
  if (redis) return redis;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn("[Redis] UPSTASH_REDIS_REST_URL / TOKEN not set — skipping cache");
    return null;
  }
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log("[Redis] Connected to Upstash");
  } catch {
    console.warn("[Redis] Failed to connect — skipping cache");
    redis = null;
  }
  return redis;
}

export default getRedis;
