import { createHash } from "node:crypto";
import { z } from "zod";
import { Errors } from "@/lib/errors";

// ---- POST /bookings body ------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const requiredText = (field: string, max: number) =>
  z
    .string({ error: `${field} is required` })
    .trim()
    .min(1, `${field} is required`)
    .max(max, `${field} is too long`);

const newBookingSchema = z.object({
  slot_id: requiredText("slot_id", 200),
  name: requiredText("name", 200),
  email: z
    .string({ error: "email is required" })
    .trim()
    .min(1, "email is required")
    .max(320, "email is too long")
    .toLowerCase()
    .regex(EMAIL_RE, "email is not valid"),
});

export type NewBooking = z.infer<typeof newBookingSchema>;

/** The body must be a JSON object; anything else is a 400. */
export function asObject(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw Errors.badRequest("request body must be a JSON object");
  }
  return body as Record<string, unknown>;
}

/** Trims name/email, lower-cases email, and 400s with the first problem found. */
export function parseNewBooking(fields: Record<string, unknown>): NewBooking {
  const result = newBookingSchema.safeParse(fields);
  if (!result.success) throw Errors.badRequest(result.error.issues[0]?.message ?? "invalid request");
  return result.data;
}

/** The rate-limit key for a request: the (trimmed, lower-cased) email, or "" if none. */
export function emailKeyOf(fields: Record<string, unknown>): string {
  return typeof fields.email === "string" ? fields.email.trim().toLowerCase().slice(0, 320) : "";
}

/**
 * Stable hash of "what was asked for". Two requests with the same Idempotency-Key
 * are "the same" when this matches. Computed on a best-effort normalisation so it
 * works before (and independently of) validation.
 */
export function fingerprint(fields: Record<string, unknown>): string {
  const norm = (v: unknown, lower = false) =>
    typeof v === "string" ? (lower ? v.trim().toLowerCase() : v.trim()) : (v ?? null);
  return createHash("sha256")
    .update(JSON.stringify([norm(fields.slot_id), norm(fields.name), norm(fields.email, true)]))
    .digest("hex");
}

// ---- POST /reset body ---------------------------------------------------------

const isoDate = (field: string) =>
  z
    .string({ error: `${field} must be a date-time string` })
    .refine((s) => !Number.isNaN(Date.parse(s)), `${field} must be a valid date-time`);

const resetSchema = z.object({
  slots: z.array(
    z.object({
      id: requiredText("slot id", 200),
      provider: requiredText("provider", 200),
      start: isoDate("start"),
      end: isoDate("end"),
    }),
    { error: "slots must be an array" },
  ),
});

export interface ResetSlot {
  id: string;
  provider: string;
  start: Date;
  end: Date;
}

export function parseReset(body: unknown): ResetSlot[] {
  const result = resetSchema.safeParse(body);
  if (!result.success) throw Errors.badRequest(result.error.issues[0]?.message ?? "invalid request");

  const seen = new Set<string>();
  for (const s of result.data.slots) {
    if (seen.has(s.id)) throw Errors.badRequest(`duplicate slot id: ${s.id}`);
    seen.add(s.id);
  }
  return result.data.slots.map((s) => ({
    id: s.id,
    provider: s.provider,
    start: new Date(s.start),
    end: new Date(s.end),
  }));
}

// ---- GET /bookings query ------------------------------------------------------

export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;

/** Missing → 10. Otherwise it must be a whole number from 1 to 50, else 400. */
export function parseLimit(raw: string | null): number {
  if (raw === null) return DEFAULT_LIMIT;
  if (!/^\d+$/.test(raw.trim())) throw Errors.badRequest("limit must be an integer between 1 and 50");
  const n = Number(raw.trim());
  if (n < 1 || n > MAX_LIMIT) throw Errors.badRequest("limit must be an integer between 1 and 50");
  return n;
}

export interface Cursor {
  /** createdAt of the last item on the previous page, in epoch milliseconds. */
  t: number;
  /** id of the last item on the previous page (tie-breaker). */
  id: string;
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}

export function decodeCursor(raw: string): Cursor {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof parsed?.t === "number" && Number.isFinite(parsed.t) && typeof parsed?.id === "string") {
      return { t: parsed.t, id: parsed.id };
    }
  } catch {
    // fall through
  }
  throw Errors.badRequest("invalid cursor");
}
