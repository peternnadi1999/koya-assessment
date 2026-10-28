import { Prisma, type Booking, type Slot } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { Cursor, ResetSlot } from "../schemas/booking.schema";

// The repository is the ONLY layer that talks to Prisma.

export class SlotTakenError extends Error {}
export class SlotMissingError extends Error {}
export class IdempotencyKeyTakenError extends Error {}

const isCode = (err: unknown, code: string) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === code;

export type SlotWithBooked = Slot & { bookings: { id: string }[] };
export type BookingWithSlot = Booking & { slot: Slot };

// ---- slots ---------------------------------------------------------------------

export function findSlots(provider: string | null): Promise<SlotWithBooked[]> {
  return prisma.slot.findMany({
    where: provider === null ? undefined : { provider },
    orderBy: [{ start: "asc" }, { id: "asc" }],
    include: { bookings: { where: { status: "confirmed" }, select: { id: true }, take: 1 } },
  });
}

export function findSlotById(id: string): Promise<Slot | null> {
  return prisma.slot.findUnique({ where: { id } });
}

/** Wipes every booking (and what hangs off them) and installs exactly these slots. */
export async function replaceAllSlots(slots: ResetSlot[]): Promise<void> {
  await prisma.$transaction(
    [
      prisma.idempotencyRecord.deleteMany(),
      prisma.bookingAttempt.deleteMany(),
      prisma.booking.deleteMany(),
      prisma.slot.deleteMany(),
      prisma.slot.createMany({ data: slots }),
    ],
  );
}

// ---- bookings ------------------------------------------------------------------

export function findBookingById(id: string): Promise<BookingWithSlot | null> {
  return prisma.booking.findUnique({ where: { id }, include: { slot: true } });
}

export interface NewBookingRow {
  id: string;
  slotId: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface IdempotencyEntry {
  key: string;
  requestHash: string;
  response: Prisma.InputJsonValue;
}

/**
 * Creates a booking race-safely.
 *
 * The partial unique index (one confirmed booking per slot) is what actually stops
 * two people booking the same slot: the loser's INSERT fails and we report
 * SlotTakenError. When an idempotency entry is given it is inserted FIRST, in the
 * same transaction, so two simultaneous requests with one key can't both proceed —
 * the second blocks on the key, then fails with IdempotencyKeyTakenError and the
 * caller replays the stored response.
 */
export async function insertBooking(
  row: NewBookingRow,
  idempotency?: IdempotencyEntry,
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      if (idempotency) {
        try {
          await tx.idempotencyRecord.create({ data: idempotency });
        } catch (err) {
          if (isCode(err, "P2002")) throw new IdempotencyKeyTakenError();
          throw err;
        }
      }
      try {
        await tx.booking.create({ data: { ...row, status: "confirmed" } });
      } catch (err) {
        if (isCode(err, "P2002")) throw new SlotTakenError();
        if (isCode(err, "P2003")) throw new SlotMissingError(); // slot vanished (e.g. /reset)
        throw err;
      }
    },
    { maxWait: 10_000, timeout: 20_000 },
  );
}

export type CancelOutcome =
  | { kind: "cancelled"; booking: Booking }
  | { kind: "already_cancelled" }
  | { kind: "missing" };

/** Atomic: only a confirmed booking can flip to cancelled, and only once. */
export async function cancelConfirmedBooking(id: string): Promise<CancelOutcome> {
  const { count } = await prisma.booking.updateMany({
    where: { id, status: "confirmed" },
    data: { status: "cancelled" },
  });
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return { kind: "missing" };
  return count === 1 ? { kind: "cancelled", booking } : { kind: "already_cancelled" };
}

/** Oldest first, keyset-paginated by (createdAt, id). Fetches one extra row to detect a next page. */
export function findBookingsPage(
  email: string,
  limit: number,
  cursor: Cursor | null,
): Promise<Booking[]> {
  const after = cursor ? new Date(cursor.t) : null;
  return prisma.booking.findMany({
    where: {
      email,
      ...(cursor && after
        ? { OR: [{ createdAt: { gt: after } }, { createdAt: after, id: { gt: cursor.id } }] }
        : {}),
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit + 1,
  });
}

// ---- idempotency ---------------------------------------------------------------

export function findIdempotencyRecord(key: string) {
  return prisma.idempotencyRecord.findUnique({ where: { key } });
}
