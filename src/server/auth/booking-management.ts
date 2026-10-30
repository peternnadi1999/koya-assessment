import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";

export function createBookingManagementToken(id: string, email: string): string {
  return createHmac("sha256", getEnv().API_KEY)
    .update(`booking-management:v1\0${id}\0${email}`)
    .digest("hex");
}

export function verifyBookingManagementToken(
  id: string,
  email: string,
  token: string,
): boolean {
  if (!/^[\da-f]{64}$/i.test(token)) return false;
  const expected = createBookingManagementToken(id, email);
  return timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
}
