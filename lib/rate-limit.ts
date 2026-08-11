import "server-only";

import { headers } from "next/headers";

/** IP del cliente a partir de los headers que pone el proxy/hosting delante de Next.js. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export class RateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    super(`Demasiadas solicitudes. Intenta de nuevo en ${retryAfterSeconds}s.`);
    this.name = "RateLimitError";
  }
}

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Ventana fija en memoria del proceso — sin dependencias externas. Sirve
// mientras la app corra como un único proceso persistente (`next start` en
// un servidor/VPS/Docker). En un despliegue serverless (ej. Vercel) cada
// invocación puede caer en un proceso distinto y este Map no persiste entre
// ellas; en ese caso hace falta un backend compartido (ej. Upstash Redis)
// en vez de esto.
const CLEANUP_INTERVAL_MS = 5 * 60_000;
let lastCleanup = Date.now();

function cleanupStaleBuckets(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Límite de ventana fija por `key` (ej. `"login:203.0.113.4"`). Lanza
 * RateLimitError si se excede `limit` dentro de `windowMs`; el caller decide
 * cómo mostrarlo (normalmente como `state.error`).
 */
export function rateLimit(key: string, { limit, windowMs }: { limit: number; windowMs: number }): void {
  const now = Date.now();
  cleanupStaleBuckets(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    throw new RateLimitError(Math.ceil((bucket.resetAt - now) / 1000));
  }
}
