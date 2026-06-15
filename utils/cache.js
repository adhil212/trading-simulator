import getRedis from "../config/redis.js";

export async function cacheGet(key) {
  try {
    const client = getRedis();
    if (!client) return null;
    const data = await client.get(key);
    if (!data) return null;
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    return null;
  }
}

export async function cacheSet(key, data, ttlSeconds = 60) {
  try {
    const client = getRedis();
    if (!client) return;
    await client.set(key, JSON.stringify(data), { ex: ttlSeconds });
  } catch {
    // silently fail — cache miss will fallback to DB
  }
}

export async function cacheDel(pattern) {
  try {
    const client = getRedis();
    if (!client) return;
    const keys = pattern.includes("*")
      ? await client.keys(pattern)
      : [pattern];
    if (keys.length > 0) await client.del(...keys);
  } catch {
    // silently fail
  }
}
