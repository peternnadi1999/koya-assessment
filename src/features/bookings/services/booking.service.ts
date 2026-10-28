import { randomBytes } from "node:crypto";
import type { Booking, Slot } from "@prisma/client";
import { Errors } from "@/lib/errors";
import { toIso } from "@/lib/utils";
import { enforceBookingRateLimit } from "@/server/security/rate-limit";
import * as repo from "../repositories/booking.repository";
import {
  asObject,
  decodeCursor,
  emailKeyOf,
  encodeCursor,
  fingerprint,
  parseLimit,
  parseNewBooking,
  parseReset,
} from "../schemas/booking.schema";
import type { BookingDTO, BookingPageDTO, SlotDTO } from "../types";

// The service holds the business rules and maps DB rows to the spec's wire shapes.

function toSlotDTO(slot: repo.SlotWithBooked): SlotDTO {
  return {
    id: slot.id,
    provider: slot.provider,
    start: toIso(slot.start),
    end: toIso(slot.end),
    available: slot.bookings.length === 0,
  };
}

function toBookingDTO(b: Booking): BookingDTO {
  return {
    id: b.id,
    slot_id: b.slotId,
    name: b.name,
    email: b.email,
    status: b.status,
    created_at: toIso(b.createdAt),
  };
}

/** Unique, and sorts in creation order (time prefix) so same-millisecond ties stay stable. */
function newBookingId(at: Date): string {
  return `bk_${at.getTime().toString(36).padStart(9, "0")}${randomBytes(8).toString("hex")}`;
}

// ---- Level 1 -------------------------------------------------------------------

export async function resetSlots(body: unknown): Promise<void> {
  await repo.replaceAllSlots(parseReset(body));
}

export async function listSlots(provider: string | null): Promise<{ slots: SlotDTO[] }> {
  return { slots: (await repo.findSlots(provider)).map(toSlotDTO) };
}

/** For the web page: slots that are still free and haven't started. */
export async function listOpenSlots(): Promise<SlotDTO[]> {
  const { slots } = await listSlots(null);
  const now = Date.now();
  return slots.filter((s) => s.available && new Date(s.start).getTime() > now);
}

export async function getBooking(id: string): Promise<BookingDTO> {
  const booking = await repo.findBookingById(id);
  if (!booking) throw Errors.notFound("booking not found");
  return toBookingDTO(booking);
}

/** For the confirmation page: the booking plus the slot it is for. */
export async function getConfirmation(
  id: string,
): Promise<{ booking: BookingDTO; slot: Pick<Slot, "provider"> & { start: string; end: string } }> {
  const found = await repo.findBookingById(id);
  if (!found) throw Errors.notFound("booking not found");
  return {
    booking: toBookingDTO(found),
    slot: { provider: found.slot.provider, start: toIso(found.slot.start), end: toIso(found.slot.end) },
  };
}

// ---- Levels 2–5: booking a slot -------------------------------------------------

function replayOrReject(
  stored: { requestHash: string; response: unknown },
  hash: string,
): BookingDTO {
  if (stored.requestHash !== hash) {
    throw Errors.unprocessable("Idempotency-Key was already used with a different request body");
  }
  return stored.response as BookingDTO;
}

/**
 * Order of checks:
 *  1. Idempotency replay (same key + same body → same booking; different body → 422).
 *     Replays are not new attempts, so they don't use up the email's rate limit.
 *  2. Rate limit — counts every attempt for this email, including ones that fail below.
 *  3. Validation (400) → slot exists (404) → slot not started (400).
 *  4. Insert; the database turns a lost race into a 409.
 */
export async function createBooking(
  rawBody: unknown,
  idempotencyKey: string | null,
): Promise<BookingDTO> {
  const fields = asObject(rawBody);
  const key = idempotencyKey?.trim() || null;
  const hash = fingerprint(fields);

  if (key) {
    const stored = await repo.findIdempotencyRecord(key);
    if (stored) return replayOrReject(stored, hash);
  }

  const emailKey = emailKeyOf(fields);
  if (emailKey) await enforceBookingRateLimit(emailKey);

  const input = parseNewBooking(fields);

  const slot = await repo.findSlotById(input.slot_id);
  if (!slot) throw Errors.notFound("slot not found");
  if (slot.start.getTime() <= Date.now()) throw Errors.badRequest("slot has already started");

  const createdAt = new Date(); // ms precision is what Postgres stores, so reads match this response
  const row = {
    id: newBookingId(createdAt),
    slotId: slot.id,
    name: input.name,
    email: input.email,
    createdAt,
  };
  const dto: BookingDTO = {
    id: row.id,
    slot_id: row.slotId,
    name: row.name,
    email: row.email,
    status: "confirmed",
    created_at: toIso(createdAt),
  };

  try {
    await repo.insertBooking(row, key ? { key, requestHash: hash, response: { ...dto } } : undefined);
    return dto;
  } catch (err) {
    if (err instanceof repo.SlotTakenError) throw Errors.conflict("slot is already booked");
    if (err instanceof repo.SlotMissingError) throw Errors.notFound("slot not found");
    if (err instanceof repo.IdempotencyKeyTakenError && key) {
      const stored = await repo.findIdempotencyRecord(key);
      if (stored) return replayOrReject(stored, hash);
    }
    throw err;
  }
}

// ---- Level 3 -------------------------------------------------------------------

export async function cancelBooking(id: string): Promise<BookingDTO> {
  const outcome = await repo.cancelConfirmedBooking(id);
  if (outcome.kind === "missing") throw Errors.notFound("booking not found");
  if (outcome.kind === "already_cancelled") throw Errors.conflict("booking is already cancelled");
  return toBookingDTO(outcome.booking);
}

// ---- Level 4 -------------------------------------------------------------------

export async function listBookings(params: {
  email: string | null;
  limit: string | null;
  cursor: string | null;
}): Promise<BookingPageDTO> {
  const email = params.email?.trim().toLowerCase() ?? "";
  if (!email) throw Errors.badRequest("email is required");
  const limit = parseLimit(params.limit);
  const cursor = params.cursor ? decodeCursor(params.cursor) : null;

  const rows = await repo.findBookingsPage(email, limit, cursor);
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  const hasMore = rows.length > limit;

  return {
    bookings: page.map(toBookingDTO),
    next_cursor: hasMore && last ? encodeCursor({ t: last.createdAt.getTime(), id: last.id }) : null,
  };
}
