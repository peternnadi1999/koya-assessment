import { createHash, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";
import { Errors } from "@/lib/errors";

// The spec's header is `X-API-Key` (HTTP header names are case-insensitive).
export const API_KEY_HEADER = "x-api-key";

/** Constant-time comparison. Hashing first makes both buffers the same length. */
export function verifyApiKey(provided: string | null | undefined, expected: string): boolean {
  if (!provided) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Throws a 401 AppError unless the request carries the right API key. */
export function requireApiKey(request: Request): void {
  const provided = request.headers.get(API_KEY_HEADER);
  if (!verifyApiKey(provided, getEnv().API_KEY)) {
    throw Errors.unauthorized();
  }
}
