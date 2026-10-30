import { afterAll, describe, expect, it } from "vitest";
import {
  createBookingManagementToken,
  verifyBookingManagementToken,
} from "@/server/auth/booking-management";

const originalApiKey = process.env.API_KEY;
const originalDatabaseUrl = process.env.DATABASE_URL;
process.env.API_KEY = "unit-test-management-signing-key";
process.env.DATABASE_URL = "postgresql://localhost/clinic_booking_test";

afterAll(() => {
  if (originalApiKey === undefined) delete process.env.API_KEY;
  else process.env.API_KEY = originalApiKey;
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
});

describe("booking management token", () => {
  const booking = { id: "bk_test", email: "patient@example.com" };

  it("verifies a token for the booking it was created for", () => {
    const token = createBookingManagementToken(booking.id, booking.email);
    expect(verifyBookingManagementToken(booking.id, booking.email, token)).toBe(true);
  });

  it("rejects a token for a different booking or email", () => {
    const token = createBookingManagementToken(booking.id, booking.email);
    expect(verifyBookingManagementToken("bk_other", booking.email, token)).toBe(false);
    expect(verifyBookingManagementToken(booking.id, "other@example.com", token)).toBe(false);
  });

  it("rejects malformed or altered tokens", () => {
    const token = createBookingManagementToken(booking.id, booking.email);
    expect(verifyBookingManagementToken(booking.id, booking.email, "invalid")).toBe(false);
    const altered = `${token.slice(0, -1)}${token.endsWith("0") ? "1" : "0"}`;
    expect(verifyBookingManagementToken(booking.id, booking.email, altered)).toBe(false);
  });
});
