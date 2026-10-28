import { Errors } from "@/lib/errors";
import { prisma } from "@/server/db/prisma";

export const BOOKING_ATTEMPT_LIMIT = 5;
export const BOOKING_ATTEMPT_WINDOW_MS = 60_000;

export interface AttemptResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Sliding-window limiter: at most 5 booking attempts per email in any 60 seconds.
 *
 * Every attempt is recorded in Postgres — serverless instances share no memory — and
 * the check-and-record runs inside one transaction guarded by a per-email advisory
 * lock, so a burst of simultaneous requests can't all squeeze past the limit.
 * Rejected (429) attempts are not recorded, so the wait never extends itself.
 */
export async function recordBookingAttempt(
  email: string,
  now: number = Date.now(),
): Promise<AttemptResult> {
  return prisma.$transaction(
    async (tx) => {
      // $executeRaw (not $queryRaw): the lock function returns `void`, which Prisma can't read back.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${email}))`;

      const windowStart = new Date(now - BOOKING_ATTEMPT_WINDOW_MS);
      await tx.bookingAttempt.deleteMany({ where: { email, at: { lt: windowStart } } });

      const recent = await tx.bookingAttempt.findMany({
        where: { email, at: { gte: windowStart } },
        orderBy: { at: "asc" },
        take: BOOKING_ATTEMPT_LIMIT,
      });

      if (recent.length >= BOOKING_ATTEMPT_LIMIT) {
        const oldest = recent[0].at.getTime();
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((oldest + BOOKING_ATTEMPT_WINDOW_MS - now) / 1000),
        );
        return { allowed: false, retryAfterSeconds };
      }

      await tx.bookingAttempt.create({ data: { email, at: new Date(now) } });
      return { allowed: true, retryAfterSeconds: 0 };
    },
    { maxWait: 10_000, timeout: 20_000 },
  );
}

/** Records the attempt, or throws a 429 with a Retry-After header. */
export async function enforceBookingRateLimit(email: string): Promise<void> {
  const result = await recordBookingAttempt(email);
  if (!result.allowed) throw Errors.tooManyRequests(result.retryAfterSeconds);
}
