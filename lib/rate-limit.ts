import "server-only";

import { headers } from "next/headers";
import { ipAddress } from "@vercel/functions";

/**
 * IP del cliente para usar como clave de rate limit. Antes se leía el
 * primer valor de x-forwarded-for directamente — un header que cualquier
 * cliente controla por completo (basta mandar un valor distinto en cada
 * request para caer siempre en un bucket nuevo y esquivar el límite). Se
 * usa en su lugar x-real-ip vía ipAddress() de @vercel/functions: en el
 * hosting de este proyecto (Vercel, ver README), ese header lo calcula y
 * fija la red de Vercel a partir de la conexión TCP real, y el valor que
 * un cliente intente mandar con ese mismo nombre se descarta en el edge
 * antes de llegar a esta función. En local (`next dev`, sin ese proxy
 * delante) no viene seteado — cae a "unknown", igual que antes cuando
 * faltaban ambos headers.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  // No se le pasa `h` directo a ipAddress(): las ReadonlyHeaders de Next.js
  // tienen su propia propiedad interna `.headers` (su proxy de
  // implementación), e ipAddress() decide si recibió un Request o un
  // Headers mirando "headers" in input — con `h` directo, esa condición da
  // true y termina leyendo el proxy interno de Next (que no tiene .get())
  // en vez de los headers reales. Envolver en un objeto { get } evita esa
  // detección ambigua.
  return ipAddress({ get: (name: string) => h.get(name) }) ?? "unknown";
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
